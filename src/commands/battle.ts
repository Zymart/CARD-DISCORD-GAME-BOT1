export const name = "battle";
export const help = "<pve|pvp> - start a battle (pve simulated)";
export async function run(message: any, args: string[]) {
  const mode = (args[0] || "pve").toLowerCase();
  if (mode === "pve") {
    await message.reply("PvE demo: not fully implemented in scaffold. Use this command as a placeholder.");
    return;
  } else {
    await message.reply("PvP requires challenge/accept flow. Not implemented in scaffold.");
    return;
  }
}