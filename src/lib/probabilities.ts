export const rarities = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
  "Mythic",
  "Secret",
  "Mega Secret",
  "Absolute Secret",
  "God Creation"
] as const;

export type Rarity = typeof rarities[number];

export const packWeights: Record<string, Record<Rarity, number>> = {
  poor: {
    Common: 60,
    Uncommon: 25,
    Rare: 10,
    Epic: 3,
    Legendary: 1,
    Mythic: 0.5,
    Secret: 0.3,
    "Mega Secret": 0.1,
    "Absolute Secret": 0.05,
    "God Creation": 0.05
  },
  big: {
    Common: 45,
    Uncommon: 30,
    Rare: 15,
    Epic: 6,
    Legendary: 2,
    Mythic: 0.7,
    Secret: 0.2,
    "Mega Secret": 0.05,
    "Absolute Secret": 0.03,
    "God Creation": 0.02
  },
  rich: {
    Common: 30,
    Uncommon: 30,
    Rare: 20,
    Epic: 12,
    Legendary: 5,
    Mythic: 1,
    Secret: 0.5,
    "Mega Secret": 0.1,
    "Absolute Secret": 0.05,
    "God Creation": 0.05
  },
  king: {
    Common: 15,
    Uncommon: 20,
    Rare: 25,
    Epic: 18,
    Legendary: 12,
    Mythic: 6,
    Secret: 2,
    "Mega Secret": 0.5,
    "Absolute Secret": 0.3,
    "God Creation": 0.2
  }
};

export function pickRarity(packType: string) {
  const weights = packWeights[packType] || packWeights.rich;
  const entries = Object.entries(weights) as [Rarity, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [rarity, weight] of entries) {
    r -= weight;
    if (r <= 0) return rarity;
  }
  return entries[entries.length - 1][0];
}