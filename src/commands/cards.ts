import { getUserCards } from "../lib/db";

export const name = "cards";
export const help = "- lists your cards";
export async function run(message: any) {
  const discordId = message.author.id;
  const cards = getUserCards(discordId);
  if (!cards.length) {
    await message.reply("You have no cards yet. Use !register to get a starter pack.");
    return;
  }
  const lines = cards.slice(0, 25).map((c: any) => `${c.id} — ${c.name} [${c.rarity}] L${c.level || 1}`);
  await message.reply("Your cards:\n" + lines.join("\n"));
}