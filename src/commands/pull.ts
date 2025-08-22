import { pullOne, seedTemplates } from "../lib/cards";
import { getCardImage } from "../lib/imageService";
import { v4 as uuidv4 } from "uuid";
import { createUserCard } from "../lib/db";

export const name = "pull";
export const help = "<pack> - open a pack (poor|big|rich|king)";
export async function run(message: any, args: string[]) {
  const pack = (args[0] || "rich").toLowerCase();
  const discordId = message.author.id;
  seedTemplates();
  const costByPack: Record<string, number> = { poor: 10, big: 50, rich: 150, king: 1000 };
  const cost = costByPack[pack] || 150;

  const count = pack === "king" ? 5 : 3;
  const pulls: any[] = [];
  for (let i = 0; i < count; i++) {
    const template = pullOne(pack);
    const instanceId = uuidv4();
    createUserCard(discordId, template.id, instanceId);
    const imagePath = await getCardImage(template.name, template.description || "", !!template.is_god_tier);
    pulls.push({ template, instanceId, imagePath });
  }

  const text = pulls.map((p, i) => `${i + 1}. ${p.template.name} [${p.template.rarity}] (${p.template.type})`).join("\n");
  await message.reply(`You opened a ${pack} pack and got:\n${text}`);
}