```markdown
# Card Discord Game Bot

This branch adds:
- OpenAI-backed image service with caching, rate-limiting and Stability fallback.
- Message-prefix command handling (prefix default `!`).
- Seeder script and JSON data file with many card templates (Naruto, DBZ, Black Clover, Bleach, Demon Slayer, Solo Leveling, My Hero, One Punch Man, etc.).

Setup
1. Copy `.env.example` to `.env` and fill values.
2. npm install
3. Run the bot once to ensure DB is initialized: `npm run dev`
4. Seed templates: `npm run seed-cards`
5. Use commands: `!register`, `!pull rich`, `!cards`, `!evolve <id>`

Notes
- OpenAI images endpoint used: set OPENAI_API_KEY and AI_PROVIDER=openai.
- Image caching avoids duplicate generation and rate-limits requests.
```