import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const CACHE_DIR = process.env.IMAGE_CACHE_DIR || "./cache/images";
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const AI_PROVIDER = (process.env.AI_PROVIDER || "openai").toLowerCase();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "";
const STABILITY_API_KEY = process.env.STABILITY_API_KEY || "";
const RATE_PER_MIN = Number(process.env.AI_RATE_LIMIT_PER_MIN || "60");
const BUCKET_CAPACITY = Math.max(1, RATE_PER_MIN);
const TOKENS_PER_INTERVAL = RATE_PER_MIN;
const INTERVAL_MS = 60000;

let tokens = BUCKET_CAPACITY;
let lastRefill = Date.now();

function refillTokens() {
  const now = Date.now();
  if (now - lastRefill >= INTERVAL_MS) {
    tokens = Math.min(BUCKET_CAPACITY, tokens + TOKENS_PER_INTERVAL);
    lastRefill = now;
  }
}

type ResolveFn = (path: string | null) => void;
const queue: Array<{ fn: () => Promise<string | null>; resolve: ResolveFn; reject: (e: any) => void }> = [];

let processing = false;

async function processQueue() {
  if (processing) return;
  processing = true;
  while (queue.length) {
    refillTokens();
    if (tokens <= 0) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    const item = queue.shift()!;
    try {
      tokens = Math.max(0, tokens - 1);
      const result = await item.fn();
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    }
  }
  processing = false;
}

const inProgress: Record<string, Promise<string | null>> = {};

export async function getCardImage(cardName: string, prompt: string, isCinematic = false): Promise<string | null> {
  const safeName = cardName.replace(/[^a-z0-9_\-]/gi, "_").toLowerCase();
  const suffix = isCinematic ? "god" : "std";
  const filename = `${safeName}_${suffix}.png`;
  const filePath = path.join(CACHE_DIR, filename);

  if (fs.existsSync(filePath)) return filePath;

  if (inProgress[filePath]) return inProgress[filePath];

  const p = new Promise<string | null>((resolve, reject) => {
    queue.push({
      fn: async () => {
        const composedPrompt = `${cardName}. ${prompt || ""} Highly detailed, dynamic card art, cinematic lighting, vibrant colors, character-centered, 3/4 action pose.`;
        if (AI_PROVIDER === "openai" && OPENAI_API_KEY) {
          try {
            const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
            const size = isCinematic ? "1024x1024" : "512x512";
            const res = await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`
              },
              body: JSON.stringify({
                model,
                prompt: composedPrompt,
                size,
                n: 1
              })
            });
            if (!res.ok) {
              const txt = await res.text().catch(() => "");
              console.error("OpenAI images API failed:", res.status, txt);
              throw new Error("OpenAI images API error");
            }
            const json = await res.json();
            if (json?.data && Array.isArray(json.data) && json.data[0]) {
              const entry = json.data[0];
              if (entry.b64_json) {
                const buf = Buffer.from(entry.b64_json, "base64");
                fs.writeFileSync(filePath, buf);
                return filePath;
              }
              if (entry.url) {
                const imgRes = await fetch(entry.url);
                const buf = Buffer.from(await imgRes.arrayBuffer());
                fs.writeFileSync(filePath, buf);
                return filePath;
              }
            }
            console.error("OpenAI returned unexpected image payload", json);
          } catch (err) {
            console.warn("OpenAI provider failed, falling back to others:", err);
          }
        }

        if (AI_PROVIDER === "stability" && STABILITY_API_KEY) {
          try {
            const sdUrl = process.env.STABILITY_API_URL || "https://api.stability.ai/v1/generation/stable-diffusion-512-v2-1/text-to-image";
            const size = isCinematic ? { width: 1024, height: 1024 } : { width: 512, height: 512 };
            const res = await fetch(sdUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${STABILITY_API_KEY}`
              },
              body: JSON.stringify({
                text_prompts: [{ text: composedPrompt }],
                width: size.width,
                height: size.height,
                samples: 1
              })
            });
            if (!res.ok) {
              const txt = await res.text().catch(() => "");
              console.error("Stability API error:", res.status, txt);
              throw new Error("Stability API error");
            }
            const json = await res.json();
            if (json?.artifacts && Array.isArray(json.artifacts) && json.artifacts[0]?.base64) {
              const buf = Buffer.from(json.artifacts[0].base64, "base64");
              fs.writeFileSync(filePath, buf);
              return filePath;
            }
          } catch (err) {
            console.warn("Stability provider failed:", err);
          }
        }

        try {
          const placeholderUrl =
            (isCinematic ? "https://via.placeholder.com/1024x1024.png?text=" : "https://via.placeholder.com/512x512.png?text=") +
            encodeURIComponent(cardName);
          const res = await fetch(placeholderUrl);
          const buf = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(filePath, buf);
          return filePath;
        } catch (err) {
          console.error("Placeholder fallback failed:", err);
          return null;
        }
      },
      resolve,
      reject
    });
    processQueue().catch((e) => {
      console.error("Queue processing error", e);
    });
  });

  inProgress[filePath] = p;
  p.finally(() => {
    delete inProgress[filePath];
  });
  return p;
}