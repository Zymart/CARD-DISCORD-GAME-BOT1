import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import { insertTemplateIfMissing } from "../lib/db";

const DATA_PATH = path.join(__dirname, "../data/cards_seed.json");

if (!fs.existsSync(DATA_PATH)) {
  console.error("Seed data file missing:", DATA_PATH);
  process.exit(1);
}

const raw = fs.readFileSync(DATA_PATH, "utf-8");
let arr: any[];
try {
  arr = JSON.parse(raw);
} catch (err) {
  console.error("Invalid JSON in seed file:", err);
  process.exit(1);
}

let count = 0;
for (const item of arr) {
  try {
    if (!item.name) continue;
    insertTemplateIfMissing({
      name: item.name,
      type: item.type || "Attack",
      rarity: item.rarity || "Common",
      base_damage: Number(item.base_damage || item.damage || 0) || 0,
      description: item.description || item.desc || "",
      image_url: item.image_url || "",
      is_god_tier: item.rarity === "God Creation" ? 1 : 0
    });
    count++;
  } catch (e) {
    console.warn("Failed to insert template:", item.name, e);
  }
}
console.log(`Seed completed. Insert attempted for ${count} templates.`);