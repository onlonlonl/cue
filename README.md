# Cue · 线索

A daily curiosity exchange for you and your Claude.

Each day, one card for you, one card for Claude. You teach each other something — knowledge, experience, or just a question you've been holding. Over time, the cards connect into a star map of shared curiosity.

---

## Features

- **Daily flip card** — front side: Claude teaches you (concept / explanation / references); back side: you teach Claude (freeform)
- **Spaced repetition** — forgetting curve drives review schedule, three question types (fill-in-the-blank, Feynman explanation, association)
- **Star map** — knowledge graph that grows organically; mastered nodes glow, undiscovered ones wait as dark stars
- **Card library** — search, filter by constellation, sort by mastery or review date

## How It Works

1. Open Cue → connect your Supabase endpoint
2. On the **Today** page, request a card or let Claude surprise you
3. Flip the card to teach Claude something in return
4. Claude reads your teaching via MCP and responds
5. Review due cards when they surface
6. Watch the star map grow

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Single HTML + React CDN + Babel pre-compiled |
| Backend | Supabase (Postgres + Edge Functions) |
| AI | Claude via Supabase MCP |
| Deploy | GitHub Pages |

## Setup

1. **Supabase**: Run `supabase/setup.sql` in your project's SQL editor
2. **Edge Function**: Deploy `supabase/edge-function.ts` with `verify_jwt: false`
3. **Claude**: Add `CLAUDE_INSTRUCTIONS.md` to your Claude project
4. **Deploy**: Upload `index.html` to a GitHub repo, enable Pages

## File Structure

```
cue/
├── index.html                 ← Single-file web app
├── README.md
├── LICENSE                    ← CC BY-NC 4.0
├── CLAUDE_INSTRUCTIONS.md     ← Claude's guide to reading/writing data
└── supabase/
    ├── setup.sql              ← Database tables
    └── edge-function.ts       ← API endpoint
```

---

CUE · Built with ❔ by Iris & Lux
