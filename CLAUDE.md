# Klarity Companion

Hackathon project. Full plan in `PLAN.md` — read it once at session start if you haven't already.

## Stack

- Next.js (App Router) + TS + Tailwind + shadcn/ui
- InsForge (Postgres, auth, edge functions, realtime)
- Retell AI (voice agent + post-call webhooks)
- Anthropic Claude API (coach + SOAP generation)
- Deployed on Zeabur

## Conventions

- All env vars in `.env.local`, never commit
- API routes under `app/api/`
- Server components by default, `"use client"` only when needed
- Keep functions small; this is a 4-hour hackathon, not production

## Workflow rules

- Confirm plan before running multi-step commands
- After each phase in PLAN.md, stop and report status before continuing
- Don't refactor working code unless I ask
- If something's ambiguous, ask — don't guess
- Do as much self-validation if possible before considering a step done
