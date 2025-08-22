import { getOrCreateUser } from "../lib/db";
import { giveStarterPack } from "../lib/cards";

export const name = "register";
export const help = "- register: Register and receive starter cards";
export async function run(message: any) {
  const discordId = message.author.id;
  getOrCreateUser(discordId);
  const created = giveStarterPack(discordId);
  await message.reply(`Welcome ${message.author.username}! You received ${created.length} starter cards.`);
}