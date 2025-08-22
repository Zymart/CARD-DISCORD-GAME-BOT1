import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const DB_PATH = process.env.DB_PATH || "./data/game.db";
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);

const initSql = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT UNIQUE NOT NULL,
  gold INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS card_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  rarity TEXT NOT NULL,
  base_damage INTEGER NOT NULL,
  description TEXT,
  image_url TEXT,
  is_god_tier INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_cards (
  id TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  template_id INTEGER NOT NULL,
  level INTEGER DEFAULT 1,
  evolved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id),
  FOREIGN KEY(template_id) REFERENCES card_templates(id)
);

CREATE TABLE IF NOT EXISTS pulls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  pack_type TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

db.exec(initSql);

export function getOrCreateUser(discordId: string) {
  let row = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(discordId);
  if (!row) {
    const info = db.prepare("INSERT INTO users (discord_id, gold, xp) VALUES (?, ?, ?)").run(discordId, 100, 0);
    row = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  }
  return row;
}

export function addGold(discordId: string, amount: number) {
  db.prepare("UPDATE users SET gold = gold + ? WHERE discord_id = ?").run(amount, discordId);
}

export function getUserByDiscordId(discordId: string) {
  return db.prepare("SELECT * FROM users WHERE discord_id = ?").get(discordId);
}

export function insertTemplateIfMissing(t: {
  name: string;
  type: string;
  rarity: string;
  base_damage: number;
  description?: string;
  image_url?: string;
  is_god_tier?: number;
}) {
  const existing = db.prepare("SELECT * FROM card_templates WHERE name = ?").get(t.name);
  if (existing) return existing;
  const info = db
    .prepare(
      "INSERT INTO card_templates (name, type, rarity, base_damage, description, image_url, is_god_tier) VALUES (?,?,?,?,?,?,?)"
    )
    .run(t.name, t.type, t.rarity, t.base_damage, t.description || "", t.image_url || "", t.is_god_tier ? 1 : 0);
  return db.prepare("SELECT * FROM card_templates WHERE id = ?").get(info.lastInsertRowid);
}

export function getTemplateById(id: number) {
  return db.prepare("SELECT * FROM card_templates WHERE id = ?").get(id);
}

export function listTemplates(limit = 100) {
  return db.prepare("SELECT * FROM card_templates LIMIT ?").all(limit);
}

export function createUserCard(ownerDiscordId: string, templateId: number, uuid: string) {
  const user = getOrCreateUser(ownerDiscordId);
  db.prepare("INSERT INTO user_cards (id, owner_id, template_id) VALUES (?,?,?)").run(uuid, user.id, templateId);
  return db.prepare("SELECT * FROM user_cards WHERE id = ?").get(uuid);
}

export function getUserCards(discordId: string) {
  const user = getUserByDiscordId(discordId);
  if (!user) return [];
  return db
    .prepare(
      "SELECT uc.*, ct.name, ct.type, ct.rarity, ct.base_damage, ct.description, ct.image_url, ct.is_god_tier FROM user_cards uc JOIN card_templates ct ON ct.id = uc.template_id WHERE uc.owner_id = ?"
    )
    .all(user.id);
}

export function getUserCardById(id: string) {
  return db
    .prepare(
      "SELECT uc.*, ct.name, ct.type, ct.rarity, ct.base_damage FROM user_cards uc JOIN card_templates ct ON ct.id = uc.template_id WHERE uc.id = ?"
    )
    .get(id);
}

export function setCardEvolved(id: string) {
  db.prepare("UPDATE user_cards SET evolved = 1, level = level + 1 WHERE id = ?").run(id);
}

export default db;