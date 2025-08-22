import { evolveCard, canEvolve } from "../lib/cards";
import { getUserCardById } from "../lib/db";

export const name = "evolve";
export const help = "<cardid> - attempt to evolve a card";
export async function run(message: any, args: string[]) {
  const cardId = args[0];
  if (!cardId) {
    await message.reply("Usage: !evolve <card-instance-id>");
    return;
  }
  const ownerId = message.author.id;
  const card = getUserCardById(cardId);
  if (!card) {
    await message.reply("Card not found.");
    return;
  }
  if (!canEvolve(card)) {
    await message.reply("This card cannot be evolved (Secret/God-tier or restricted).");
    return;
  }
  const result = evolveCard(cardId, ownerId);
  await message.reply(result.message);
}