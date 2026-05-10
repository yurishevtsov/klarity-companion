# Klarity Companion — Summary

A proof-of-concept AI care layer that extends a psychiatric / ADHD telehealth practice's reach into the time between visits. Built in May 2026 at **Build Smth AI-Native @ Cal**, on the Klarity track, with Retell, Zeabur, and InsForge as backend sponsors.

Live demo: <https://klarity.zeabur.app>
Source: <https://github.com/yurishevtsov/klarity-companion>

---

## The concept

The 50-minute appointment is when treatment decisions get made. Everything between visits is when patients quietly disengage, side effects go unreported, and providers fly blind. Klarity Companion is three coordinated surfaces designed to fill that gap, share data with each other, and surface what matters to the clinician.

> **One-liner:** *"Klarity does the visit. We do everything between visits."*

---

## What we built

### Coach — in-pocket text companion

- Patients open a chat anytime and talk to an ADHD/psych-aware AI coach
- CBT techniques (cognitive reframing, behavioral activation), task breakdown, body-doubling cues, medication-aware nudges
- **Crisis escalation**: if the user mentions suicidal ideation, severe side effects, medication misuse, or other clinically urgent content, the coach surfaces 988 + flags the conversation for the provider
- **`/focus` hyperfocus mode** (easter egg): types `/focus`, page dims to dark, single "Pick one thing" card, 25-min Pomodoro with animated ring countdown. Coach voice shifts to drill-sergeant-meets-supportive-friend during the session.
- **Privacy toggle**: visible disclosure that the provider can see chat summaries; one-click "private mode" hides selected turns from the dashboard while keeping them visible to the patient.
- **Markdown rendering** for AI replies (bold, italic, lists, code) — same `<Prose>` component used in the dashboard so typography is consistent.

### Sentinel — outbound voice check-ins

- Scheduled phone or in-browser web calls (web mode for hackathon since we couldn't purchase a Retell number; phone mode preserved in code)
- Structured 6-8 question battery: PHQ-2 mood screen, side-effect probe, sleep, appetite, and (for stimulants) diversion-risk
- **Post-call SOAP generation**: transcript routes to Claude Sonnet 4.5, returns structured Subjective / Objective / Assessment / Plan note + risk flags within ~6 seconds
- **Live mic level meter** + device picker that auto-skips virtual audio routing tools (BlackHole, Soundflower, etc.) so calls don't accidentally capture silence
- **Idempotent webhook** (`/api/retell-webhook`) handles `call_started`, `call_ended`, `call_analyzed` events — same handler works for any payload retried by Retell

### Clinician dashboard — unified provider view

- **Patient roster** sorted by risk tier (high → medium → low), with weekly message count and inline flag tags
- **Per-patient dashboard** with three columns:
  - **Recent Coach chat** (last 7 days, chronological order, flagged messages get red ring + flag tags inline)
  - **Sentinel call history** with full SOAP notes, status pills, duration, individual call deletion (`×` button per card)
  - **At-a-glance**: meds with day counters, phone, risk badge, full med history
- **Pre-visit brief generator** (stretch goal): synthesizes 14 days of context — coach chats + Sentinel transcripts + SOAP notes — into a 4-6 sentence primer the provider reads in 5 seconds before walking into the visit
- **Risk badge system**: `OK` (emerald) / `Watch` (amber) / `Risk` (red, with urgent banner)
- **Polling for SOAP arrival** post-call so the dashboard auto-updates without manual refresh

### Operational features

- **Restore demo state** (one-click): wipes chat / calls / SOAP for the three demo patients and re-seeds Jane's clean coach exchange + Marcus's high-risk flagged exchange. Preserves patient rows.
- **Per-call delete** on each Sentinel card so QA traces don't pollute the demo state
- **Clear chat** control on the coach page for the same reason
- **Idempotent reset / delete endpoints** so the demo is reliably restorable in seconds between rehearsals

---

## How it would help Klarity

This is mapped against findings from Klarity's [State of Independent Practice 2025–2026](https://www.beautiful.ai/player/-OlgI-UVQDay6_YIX1c1) report (referenced in the [Klarity Provider Newsletter, Feb 2026](https://klarityhealth.substack.com/p/klarity-provider-newsletter-february)):

| Pain point | Klarity Companion's contribution |
|---|---|
| **41% of practices lose 11+ hours / week to admin** | Auto-generated SOAP notes save 5–10 minutes per Sentinel check-in. Pre-visit brief replaces ~20 minutes of chart-digging with 5 seconds of reading. |
| **41% cite DEA telemedicine rules as their #1 regulatory risk** | Every Sentinel call is timestamped, recorded, transcribed, and stored — audit-ready monitoring evidence for controlled-substance prescribing. |
| **36% use no AI tools today** | First-touch AI exposure is low-stakes (a check-in call, a coaching chat) with provider-in-the-loop on anything clinical. |
| **90% expect patient volume to grow in 2026** | Coach + Sentinel scale per-patient at marginal cost — practice capacity isn't bounded by clinician hours for between-visit care. |

**Strategic positioning vs existing scribes** (Blueprint, Eleos, etc.): scribes document the visit. Klarity Companion *extends the practice between visits as a longitudinal record.* Different product category, complementary stack.

**Revenue model** (if/when productized): per-active-patient SaaS, similar in shape to Klarity's existing pricing. ROI maps to one prevented no-show per patient per month.

---

## Tech & sponsors

- **Klarity** — track + brand
- **Retell AI** — HIPAA-compliant voice agent for Sentinel calls (web call via `retell-client-js-sdk`, phone call path preserved)
- **Zeabur** — hosting (Lightsail-backed dedicated server) + AI Hub (unified gateway routing every Claude call)
- **InsForge** — Postgres backend, server-side SDK, Postgrest-compatible queries, server-side admin keys

**Frontend**: Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui (`base-nova` preset). Brand palette pulled from helloklarity.com (`#0E62F4` primary blue, `#61EFE9` cyan accent, `#4599FF` softer blue for dark mode).

**Models** (all routed through Zeabur AI Hub, OpenAI-compatible API):

| Workload | Model | Why |
|---|---|---|
| Coach chat | `claude-haiku-4-5` | ~700ms first-byte, snappy enough for ADHD-friendly chat UX |
| Risk classifier | `claude-haiku-4-5` | Fast structured JSON, runs after each assistant turn |
| Sentinel SOAP | `claude-sonnet-4-5` | Structured clinical synthesis. (Originally tried `kimi-k2.6` but reasoning latency + content-tokens-eaten-by-thinking made it impractical for the post-call window.) |
| Pre-visit brief | `claude-sonnet-4-5` | 14-day context synthesis, ~6s end-to-end |

**Vercel AI SDK 6** with `@ai-sdk/openai-compatible` (the strict `@ai-sdk/openai` provider rejects non-strict OpenAI-shaped APIs like Zeabur AI Hub). `useChat` + `DefaultChatTransport` for streaming.

---

## This is a proof of concept

> **Important caveats.** Before any real-world clinical deployment, all of the following would need genuine discussion, evaluation, and sign-off.

### HIPAA & data handling

Retell offers BAAs; InsForge supports encrypted Postgres. **Production deployment requires:**

- Signed BAAs across every vendor in the data path (Retell, Zeabur, InsForge, Anthropic, any LLM provider via Zeabur AI Hub)
- Encryption at rest and in transit
- Comprehensive audit logging
- Role-based access controls (we hardcoded "Dr. Reyes" — real auth is out of scope for a 4-hour build)
- Data retention and disposal policies
- Security review by a qualified party

We deliberately did not implement HIPAA compliance in code — we *say* HIPAA in the pitch and demo on synthetic data only.

### AI accuracy and clinical safety

- Coach replies are language-model output — informed coaching, not medical advice
- SOAP note generation needs **clinician review** before becoming part of a patient record. The model can hallucinate or misinterpret transcript nuance.
- Risk classifier achieves a baseline level of safety but is **not a substitute for trained clinical judgment**. False negatives are inevitable.
- Production needs a clinical advisory board to sign off on the system prompt, escalation rules, edge cases, and acceptable failure modes.
- Crisis escalation has two layers (in-stream + out-of-band classifier), but neither is a substitute for trained crisis intervention. The 988 surface is documented but not a guarantee of patient safety.

### Provider-in-the-loop is non-negotiable

This is a *practice extension*, not autonomous care. Every clinically significant signal is meant to surface to the human provider for action. The AI does not prescribe, diagnose, or take care decisions independently.

### Patient privacy

We added an opt-out toggle so patients can mark turns private from the provider, but a real-world privacy review would need to consider:

- Data minimization
- Retention policies
- Patient consent flows (especially for minors)
- Audit visibility
- Legal and ethical implications of an AI system that sees a patient's clinical conversations
- Whether voluntary opt-out is sufficient or if opt-in is required by jurisdiction

### Demo data is synthetic

All three patients (Jane Doe, Marcus Reed, Jordan Patel) and every interaction shown in the demo are fake. No real patient data was used in this build.

### Liability framing

In any real deployment, the practice (not the technology vendor) holds clinical responsibility. Klarity Companion's role is to *extend the practice's reach*, not to assume any portion of clinical liability.

---

## Built by

Yuri Shevtsov (with generous assistance from Claude Code) — Build Smth AI-Native @ Cal, Klarity track, May 2026.
