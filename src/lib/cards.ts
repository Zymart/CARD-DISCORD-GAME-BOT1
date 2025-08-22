import { v4 as uuidv4 } from "uuid";
import db, { insertTemplateIfMissing, createUserCard, listTemplates } from "./db";
import { pickRarity, Rarity } from "./probabilities";
import dotenv from "dotenv";
dotenv.config();

export function seedTemplates() {
  // no-op here; seed is handled by seed script which inserts many templates from data
}

export function pullOne(packType: string) {
  const chosenRarity = pickRarity(packType);
  const templates = listTemplates(10000).filter((t: any) => t.rarity === chosenRarity);
  let pool = templates;
  if (pool.length === 0) {
    pool = listTemplates(10000).filter((t: any) => ["Common", "Uncommon", "Rare", "Epic", "Legendary"].includes(t.rarity));
  }
  if (pool.length === 0) {
    pool = listTemplates(10000);
  }
  const template = pool[Math.floor(Math.random() * pool.length)];
  return template;
}

export function giveStarterPack(discordId: string) {
  // pick from existing templates
  const commonTemplates = listTemplates(10000).filter((t: any) => t.rarity === "Common");
  const rareTemplates = listTemplates(10000).filter((t: any) => t.rarity === "Rare");
  const created: any[] = [];
  for (let i = 0; i < 8; i++) {
    const t = commonTemplates.length ? commonTemplates[Math.floor(Math.random() * commonTemplates.length)] : listTemplates(1)[0];
    const uuid = uuidv4();
    createUserCard(discordId, t.id, uuid);
    created.push({ instanceId: uuid, template: t });
  }
  for (let i = 0; i < 3; i++) {
    const t = rareTemplates.length ? rareTemplates[Math.floor(Math.random() * rareTemplates.length)] : listTemplates(1)[0];
    const uuid = uuidv4();
    createUserCard(discordId, t.id, uuid);
    created.push({ instanceId: uuid, template: t });
  }
  return created;
}

export function canEvolve(template: { rarity: Rarity }) {
  const banned = ["Secret", "Mega Secret", "Absolute Secret", "God Creation"];
  return !banned.includes(template.rarity);
}

export function evolveCard(instanceId: string, ownerDiscordId: string): { success: boolean; message: string } {
  const card = db.prepare(
    "SELECT uc.*, ct.name, ct.type, ct.rarity, ct.base_damage FROM user_cards uc JOIN card_templates ct ON ct.id = uc.template_id WHERE uc.id = ?"
  ).get(instanceId);
  if (!card) return { success: false, message: "Card not found." };
  if (card.evolved) return { success: false, message: "Card already evolved." };
  if (!canEvolve(card)) return { success: false, message: "This card cannot be evolved." };

  const costByRarity: Record<string, number> = {
    Common: 50,
    Uncommon: 150,
    Rare: 400,
    Epic: 1200,
    Legendary: 4000,
    Mythic: 10000,
    Secret: 50000,
    "Mega Secret": 100000,
    "Absolute Secret": 250000,
    "God Creation": 1000000
  };

  const cost = costByRarity[card.rarity] || 200;
  const user = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(ownerDiscordId);
  if (!user) return { success: false, message: "User not found." };
  if (user.gold < cost) return { success: false, message: `You need ${cost} gold to attempt evolution.` };

  db.prepare("UPDATE users SET gold = gold - ? WHERE discord_id = ?").run(cost, ownerDiscordId);

  const chanceByRarity: Record<string, number> = {
    Common: 0.85,
    Uncommon: 0.6,
    Rare: 0.35,
    Epic: 0.18,
    Legendary: 0.08,
    Mythic: 0.03,
    Secret: 0.0,
    "Mega Secret": 0.0,
    "Absolute Secret": 0.0,
    "God Creation": 0.0
  };

  const chance = chanceByRarity[card.rarity] || 0.2;
  const roll = Math.random();
  if (roll <= chance) {
    db.prepare("UPDATE user_cards SET evolved = 1, level = level + 1 WHERE id = ?").run(instanceId);
    return { success: true, message: "Evolution successful! Card level increased." };
  } else {
    return { success: false, message: "Evolution failed. Better luck next time." };
  }
}