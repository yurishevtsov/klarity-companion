# Klarity Companion

> **Continuous care, between visits.**
> Proof-of-concept AI care layer for psychiatric and ADHD telehealth practices.

- **Live demo:** <https://klarity.zeabur.app>
- **Long-form overview:** [`/about`](https://klarity.zeabur.app/about) on the live site, mirrored in [`docs/summary.md`](docs/summary.md)
- **Built for:** Build Smth AI-Native @ Cal — Klarity track, May 2026

---

## What it is

The follow-up appointment is when treatment decisions get made. Everything between visits is when patients quietly disengage, side effects go unreported, and providers fly blind.

Klarity Companion is **three coordinated surfaces** that fill that gap, share data with each other, and surface what matters to the clinician:

| Surface | Audience | What it does |
|---|---|---|
| **Coach** | Patient · text | ADHD/psych-aware chat with CBT techniques, medication-aware nudges, crisis escalation, and a privacy toggle |
| **Sentinel** | Patient · voice | Scheduled outbound check-ins (PHQ-2, side effects, sleep, diversion-risk) with auto-generated SOAP notes in ~6 seconds |
| **Clinician dashboard** | Provider | Risk-sorted roster, per-patient 3-column view, AI-generated pre-visit brief synthesizing 14 days of context |

The coach and provider share the same chat thread. The provider can reply directly into a patient's coach conversation — turns labeled `Dr. Reyes · provider` arrive inline next to the AI's. Human-in-the-loop, no separate inbox.

## Why it matters

Mapped against Klarity's [State of Independent Practice 2025–2026](https://www.beautiful.ai/player/-OlgI-UVQDay6_YIX1c1) findings:

- **41%** of practices lose 11+ hours/week to admin → auto-SOAP + pre-visit brief reclaim that time
- **41%** cite DEA telemedicine rules as their top regulatory risk → every Sentinel call is timestamped, recorded, transcribed, stored
- **36%** use no AI tools today → low-stakes first-touch (coaching chat, structured check-in call) with the clinician always in the loop
- **90%** expect patient volume to grow in 2026 → between-visit care scales per-patient at marginal cost

**Vs scribes (Blueprint, Eleos):** *they document the visit.* Klarity Companion *extends the practice between visits as a longitudinal record.* Different product category, complementary stack.

---

## Architecture

```
   ┌──────────────┐         ┌──────────────┐         ┌──────────────────┐
   │   Coach UI   │         │  Sentinel    │         │  Clinician       │
   │  (chat, SSE) │         │  (web call)  │         │  dashboard       │
   └──────┬───────┘         └──────┬───────┘         └────────┬─────────┘
          │                        │                          │
          │   Next.js App Router (Edge + Node functions)      │
          │                        │                          │
   ┌──────┴────────────────────────┴──────────────────────────┴─────────┐
   │  /api/coach (stream)   /api/retell-webhook   /api/brief   /api/... │
   └──────┬─────────────────────┬────────────────────┬─────────┬────────┘
          │                     │                    │         │
   ┌──────┴───────┐    ┌────────┴──────┐    ┌────────┴──┐  ┌───┴─────────┐
   │  Zeabur AI   │    │   Retell AI   │    │ InsForge  │  │ Anthropic   │
   │  Hub (OAI-   │    │  (voice agent │    │ (Postgres │  │  via Zeabur │
   │  compatible) │    │   + webhooks) │    │  + SDK)   │  │  AI Hub)    │
   └──────────────┘    └───────────────┘    └───────────┘  └─────────────┘
```

- **Patient text** → Coach UI streams to `/api/coach` via Vercel AI SDK 6's `useChat` + `DefaultChatTransport`. Server uses `@ai-sdk/openai-compatible` against Zeabur AI Hub → Claude Haiku 4.5 for ~700ms first-byte. After each assistant turn, an out-of-band risk classifier (Haiku) runs on the same thread for two-layer safety.
- **Patient voice** → Retell `RetellWebClient` in-browser. Idempotent webhook at `/api/retell-webhook` handles `call_started` / `call_ended` / `call_analyzed`. SOAP generation routes the transcript to Claude Sonnet 4.5; the dashboard polls every 30s for SOAP arrival.
- **Provider view** → Same Postgres (`chat_messages`, `calls`, `clinician_notes`, `patients`, `access_log`). Roster sorted by composite risk tier. Provider replies are persisted to `chat_messages` with `role = 'provider'` so the coach context window includes them on the next turn.
- **Observability** → Root `middleware.ts` logs every page request to `access_log` (path, IP from `x-forwarded-for`, user agent, referrer). Viewable at `/admin/access` (full) and `/dev-access-log` (stripped, shareable).

### Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui (`base-nova` preset)
- **Backend:** InsForge (Postgres + server-side SDK), Next.js route handlers
- **Voice:** Retell AI (web call mode + phone path preserved in code)
- **LLM gateway:** Zeabur AI Hub (OpenAI-compatible) routing to Anthropic Claude
- **Models:** Haiku 4.5 (coach chat, risk classifier), Sonnet 4.5 (SOAP, pre-visit brief)
- **AI client:** Vercel AI SDK 6 with `@ai-sdk/openai-compatible`
- **Hosting:** Zeabur (Lightsail-backed dedicated server, K3s injects `PORT=8080`)
- **Brand:** Klarity blue `#0E62F4` / cyan `#61EFE9`

### Data model

Five tables in InsForge:

- `patients` — id, slug, name, dob, conditions[], current_meds (jsonb)
- `chat_messages` — patient_id, session_id (uuid), role, content, flags[], private (bool)
- `calls` — retell_call_id (unique), status, transcript, recording_url, duration_sec
- `clinician_notes` — source (`sentinel_call` / `coach_summary` / `pre_visit_brief`), soap_note (jsonb), risk_level
- `access_log` — path, ip, user_agent, referrer (populated by middleware)

---

## Getting started

```bash
# install
npm install

# env (copy and fill in)
cp .env.local.example .env.local

# dev
npm run dev
```

Required environment variables:

| Var | What it's for |
|---|---|
| `INSFORGE_PROJECT_ID` / `INSFORGE_API_KEY` | InsForge backend |
| `ZEABUR_AI_HUB_API_KEY` / `ZEABUR_AI_HUB_BASE_URL` | LLM gateway |
| `RETELL_API_KEY` / `RETELL_AGENT_ID` | Voice agent |
| `NEXT_PUBLIC_BASE_URL` | Used by Retell webhook callback URL |

Open <http://localhost:3000>. The home page links into the coach (`/coach/jane`) and clinician dashboard (`/clinician`). A **Restore demo state** button on home re-seeds the three demo patients (Jane / Marcus / Jordan) and clears prior session data.

### Deploy

Auto-deploys to Zeabur on push to `main` via the Zeabur GitHub app. Build uses the repo `Dockerfile` (multi-stage Alpine, Next.js `output: 'standalone'`).

---

## This is a proof of concept

**Important caveats.** Before any real-world clinical deployment, all of the following would need genuine discussion, evaluation, and sign-off:

- **HIPAA & data handling** — BAAs across every vendor in the data path, real auth (the demo hardcodes Dr. Reyes), audit logging, retention policies, security review by a qualified party.
- **AI accuracy and clinical safety** — coach replies are LM output, not medical advice. SOAP notes need clinician review. The risk classifier is not a substitute for trained judgment; false negatives are inevitable.
- **Provider-in-the-loop is non-negotiable** — practice extension, not autonomous care. The AI does not prescribe, diagnose, or take care decisions independently.
- **Patient privacy** — opt-out toggle is a starting point. A real review needs data minimization, consent flows (especially for minors), audit visibility.
- **Crisis intervention** — 988 surfacing + two-layer escalation is not a substitute for trained crisis staffing.
- **Demo data is synthetic** — no real patient data was used.

Full caveats at [`/about`](https://klarity.zeabur.app/about#caveats) and in [`docs/summary.md`](docs/summary.md).

---

## Repo layout

```
app/
  api/                  route handlers (coach, sentinel, brief, webhooks, demo reset, log)
  coach/[patientId]/    patient text surface
  clinician/            roster + per-patient dashboard
  admin/access/         full access log viewer
  dev-access-log/       stripped access viewer (shareable)
  about/                long-form overview
  not-found.tsx         branded 404
  layout.tsx, page.tsx, globals.css
components/             shared UI, KlarityMark, prose, shadcn
docs/
  summary.md            portable concept summary
  notebook-lm-brief.md  paste-ready NotebookLM prompts (mind map, video, audio, briefing doc)
middleware.ts           access logger
PLAN.md                 hackathon plan + 3-min demo runbook
CLAUDE.md               conventions for Claude Code sessions
```

---

## Built by

Yuri Shevtsov (with generous assistance from Claude Code) — Build Smth AI-Native @ Cal, Klarity track, May 2026.
