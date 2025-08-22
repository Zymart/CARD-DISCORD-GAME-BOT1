import "dotenv/config";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import fs from "fs";
import path from "path";

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("BOT_TOKEN missing in .env");
  process.exit(1);
}

const PREFIX = process.env.BOT_PREFIX || "!";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

type CommandHandler = (message: any, args: string[]) => Promise<void> | void;
const commands: Record<string, { run: CommandHandler; help?: string }> = {};

// load any ts/js files in src/commands
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
  const files = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".ts") || f.endsWith(".js"));
  for (const file of files) {
    const m = require(path.join(commandsPath, file));
    if (m && m.name && m.run) {
      commands[m.name] = { run: m.run, help: m.help || "" };
    } else if (m && m.default && m.default.name && m.default.run) {
      const cm = m.default;
      commands[cm.name] = { run: cm.run, help: cm.help || "" };
    }
  }
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}. Prefix is '${PREFIX}'`);
});

client.on("messageCreate", async (message) => {
  if (message.author?.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const [cmdRaw, ...rest] = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = cmdRaw.toLowerCase();

  if (!cmd) return;

  // simple help
  if ((cmd === "help" || cmd === "commands") && rest.length === 0) {
    const list = Object.keys(commands)
      .map((k) => `${PREFIX}${k} ${commands[k].help || ""}`)
      .join("\n");
    message.reply({ content: "Commands:\n" + list });
    return;
  }

  const handler = commands[cmd];
  if (!handler) {
    message.reply({ content: `Unknown command. Use ${PREFIX}help to list commands.` });
    return;
  }

  try {
    await handler.run(message, rest);
  } catch (err) {
    console.error("Command error", err);
    message.reply({ content: "There was an error executing that command." });
  }
});

client.login(TOKEN).catch((e) => {
  console.error("Login failed:", e);
});