# Klarity Companion — Hackathon Build Brief

**Time budget:** ~3.5 hours of build + 30 min slides. Move fast, cut features ruthlessly.

---

## What we're building

**Klarity Companion**: an AI care layer for psych/ADHD telehealth practices that extends provider reach *between* visits. Built on the Klarity hackathon track (AI for mental health practices). Two surfaces, one unified clinician view:

1. **Coach (inbound, text)** — Patient opens a chat, talks to an ADHD/psych-aware coach anytime. CBT-style techniques, task breakdown, body doubling, medication-aware nudges. NOT a therapist replacement; escalates risk.
2. **Sentinel (outbound, voice)** — Scheduled Retell voice call on day 7/14/30 post-prescription. Structured check-in: side effects, sleep, mood, PHQ-2, diversion screen for stimulants. Auto-generates a clinician note + risk flag.
3. **Clinician dashboard** — One page showing both streams per patient: chat highlights, call transcripts, auto-notes, risk flags, trend lines.

**Why it wins (target judge mental model):**
- Hits all 5 Klarity metrics: revenue (retention + completed follow-ups), retention (engagement), satisfaction (always-on care), efficiency (auto-notes save provider time), compliance (DEA monitoring evidence for controlled substances).
- Uses 4 sponsors: Klarity (track), Retell (voice), Zeabur (hosting), InsForge (backend).
- Differentiated: most teams will build scribes or intake bots. This is longitudinal between-visit care, anchored on Klarity's stated #1 regulatory pain (DEA telemed rules) and their #1 specialty (ADHD/psych).

---

## Stack & sponsors

| Layer | Choice | Why |
|---|---|---|
| Hosting | **Zeabur** | Auto-detect framework, public URL in ~2min, AI Hub for unified LLM access |
| Backend | **InsForge** | Postgres + auth + edge functions + realtime + AI gateway. MCP-friendly so Claude Code can scaffold schema fast. |
| Voice | **Retell AI** | HIPAA-compliant, ~600ms latency, drag-and-drop agent + post-call webhooks |
| LLM | Claude (via Zeabur AI Hub or direct Anthropic API) | Coach reasoning + auto-note generation |
| Frontend | Next.js (App Router) + Tailwind + shadcn/ui | Fast, looks polished |

---

## Architecture

```
                  ┌─────────────────────────────────────┐
                  │   Next.js app (Zeabur)              │
                  │   /coach   - patient chat UI        │
                  │   /clinician - dashboard            │
                  │   /api/coach - LLM proxy            │
                  │   /api/retell-webhook - call hook   │
                  └────────────┬────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
   ┌─────────┐          ┌──────────────┐      ┌────────────┐
   │ Retell  │          │  InsForge    │      │ Anthropic  │
   │ outbound│          │  Postgres    │      │ Claude API │
   │ agent   │          │  Realtime    │      │            │
   └─────────┘          └──────────────┘      └────────────┘
```

**Critical path dependency:** Retell post-call webhook needs a public URL. Deploy a stub to Zeabur in the FIRST 30 minutes so the URL exists.

---

## Data model (InsForge / Postgres)

Keep it minimal. 4 tables:

```sql
patients (
  id uuid pk,
  name text,
  dob date,
  conditions text[],          -- ['ADHD', 'GAD']
  current_meds jsonb,         -- [{name, dose, started_at}]
  provider_id uuid
)

chat_messages (
  id uuid pk,
  patient_id uuid fk,
  role text,                  -- 'user' | 'assistant'
  content text,
  created_at timestamptz,
  flags text[]                -- ['risk', 'side_effect_mentioned']
)

calls (
  id uuid pk,
  patient_id uuid fk,
  retell_call_id text,
  scheduled_for timestamptz,
  status text,                -- 'scheduled' | 'completed' | 'failed'
  transcript text,
  duration_sec int,
  created_at timestamptz
)

clinician_notes (
  id uuid pk,
  patient_id uuid fk,
  source text,                -- 'sentinel_call' | 'coach_summary'
  source_ref uuid,            -- fk to call or chat session
  soap_note jsonb,            -- {subjective, objective, assessment, plan}
  risk_level text,            -- 'low' | 'medium' | 'high'
  flags text[],
  created_at timestamptz
)
```

Seed 3 fake patients before demo:
- Jane, 28, ADHD, started Adderall XR 20mg 14 days ago
- Marcus, 34, ADHD + anxiety, on Vyvanse 30mg + Lexapro 10mg
- Jordan, 22, depression, started Wellbutrin 150mg, day 7

---

## Build order (3.5 hr)

### Phase 0 — Setup (30 min)
1. `npx create-next-app@latest klarity-companion` (TypeScript, Tailwind, App Router)
2. Install: `shadcn-ui` init, `@anthropic-ai/sdk`, `retell-sdk`
3. Set up InsForge: `npx @insforge/cli create`, scaffold the 4 tables, run seed
4. Push to GitHub, connect Zeabur, deploy stub. **Confirm public URL works.** Save it as `RETELL_WEBHOOK_URL`.
5. Get Retell account + API key. Skip phone number purchase if possible — use their web call demo for the live demo.

### Phase 1 — Coach (60 min)
- `/coach/[patientId]` page: iMessage-style chat UI
- `/api/coach/route.ts`: POST endpoint, takes message + patient context, calls Claude with system prompt below, streams response, persists both messages to InsForge
- Risk-flag pass: after every assistant response, run a quick Claude classifier call ("does this conversation contain self-harm ideation, severe side effects, or diversion concerns? return JSON"). If flagged, write to `chat_messages.flags` and show a banner on clinician dashboard.

**Coach system prompt skeleton (refine before building):**
```
You are a coaching companion for a patient of {practice_name} who has {conditions}
and is taking {current_meds}. You are NOT a therapist or medical provider.

Your role:
- Help with executive function: task breakdown, time-boxing, body doubling, implementation intentions
- Use brief CBT techniques (cognitive reframing, behavioral activation) when appropriate
- Be aware of medication context (timing, common side effects) but never give medical advice
- Keep replies short and actionable. ADHD users do better with bullet lists and clear next steps.
- If user mentions: suicidal ideation, severe side effects, medication misuse, or anything that
  feels clinically urgent → say "I'm flagging this for your provider Dr. {provider_name}. If you
  are in crisis, call or text 988." Then continue supportively.

Tone: warm, direct, no corporate fluff. You're a smart friend who gets ADHD.
```

### Phase 2 — Sentinel (60 min)
- Build one Retell agent in their dashboard (no code): conversational flow that asks 6-8 structured questions. Pull from PHQ-2 + side-effect screener + (for stimulants) diversion-risk questions.
- Set post-call webhook to `{ZEABUR_URL}/api/retell-webhook`
- `/api/retell-webhook/route.ts`:
  - Receives Retell post-call payload (transcript, recording URL, structured data)
  - Calls Claude with transcript → returns SOAP note JSON + risk level
  - Writes `calls` row + `clinician_notes` row
- "Trigger call" button on dashboard that calls Retell's outbound API with patient phone (use your own phone for demo)

### Phase 3 — Clinician dashboard (45 min)
- `/clinician` page lists patients with risk badges
- `/clinician/[patientId]` shows three columns:
  - Recent coach chat (last 24h, with flagged messages highlighted)
  - Sentinel call history with auto-generated SOAP notes
  - At-a-glance: current meds, days on med, last touchpoint, risk flag
- Use InsForge realtime subscription so the page updates live during demo

### Phase 4 — Demo polish + slides (30 min)
- See **Demo Runbook** section below for the full script. Rehearse it twice end-to-end before pitch.
- 5-slide deck: Problem (Klarity's own stats: 41% lose 11hr/wk to admin, DEA = #1 risk), Solution, Demo, Architecture, Impact metrics + "what's next"
- Build a backup video clip of the Sentinel call working, in case live call fails on stage.

---

## Things to NOT do (scope-cut warnings)

- ❌ Real SMS — fake the chat in browser. Twilio + verification = time sink.
- ❌ Real auth — clinician dashboard is "logged in as Dr. Reyes" hardcoded.
- ❌ Inbound voice (front desk) — was on the table, cut it. Outbound + chat is enough.
- ❌ HIPAA implementation — *say* HIPAA in pitch, demo on fake data.
- ❌ Multi-clinician permissions, billing, real EHR sync — none of it.
- ❌ Mobile responsive — desktop-only is fine for demo.

---

## Pitch framing (memorize these numbers)

From Klarity's own State of Independent Private Practice report:
- 41% of independent practices lose 11+ hours/week to admin
- 41% cite DEA telemed rules as primary regulatory risk
- 36% use no AI tools
- 90% expect patient volume to grow in 2026

Your one-liner: **"Klarity does the visit. We do everything between visits."**

---

## Risks & confidence levels

- **70%** that this concept is differentiated enough to top-3
- **65%** that a 2-person team finishes both Coach + Sentinel demoably in 3.5h. Solo: drop to 50%.
- **80%** that the Retell webhook is your biggest time sink. Deploy stub early.
- **60%** that judges grill you on safety/escalation. Have the 988 + clinician-flag branch visibly demo-able.
- **50%** that Klarity already has *some* coaching tool internally. If they ask: "Yours likely lives in patient portal text. Ours is voice + text + clinician-grade documentation in one loop. Show me what you have and we'll integrate."

---

## Stretch goal (only if Phases 0-3 done with 45+ min to spare)

**"Pre-visit Brief" — auto-generated 1-paragraph clinician primer**

When a provider opens a patient's upcoming appointment, Claude reads the last 2 weeks of coach chats + last Sentinel call transcript + current meds, and generates a 4-5 sentence pre-visit brief:

> "Jane is on day 14 of Adderall XR 20mg. Sentinel call on day 7 flagged mild appetite suppression but good focus gains. Coach chats this week show recurring 3pm energy crash and difficulty starting evening tasks — pattern suggests dose timing or afternoon booster discussion. PHQ-2 trending down (4→2). No risk flags. Suggest: discuss dose timing, ask about sleep onset."

**Why this adds the most value:** It closes the loop. Coach + Sentinel collect data; this is the moment that data *changes a clinical decision*. Demo-wise it's the most impressive 30 seconds — judges literally see the ROI in a paragraph.

**Build:** One Claude API call with all the patient context as input, structured output. Add a "Generate brief" button on the clinician dashboard. ~30 min to build + 10 min to tune the prompt.

**Bonus framing in pitch:** "We don't just save providers admin time. We hand them a smarter patient before the visit even starts." That's the line.

---

## Easter egg

**"Hyperfocus Mode" in the Coach** 🐙

If the patient types `/focus` or "I need to lock in" or "hyperfocus mode," the coach UI:
1. Dims the whole page background to dark
2. Pops a single card: "Pick one thing. Just one."
3. After they type it, starts a 25-min Pomodoro with a quiet animated timer
4. The coach's tone shifts: terse, drill-sergeant-meets-supportive-friend. Replies are max 1 sentence. ("Phone face down. 24 minutes left. You got this.")
5. At the 25-min mark, page returns to normal and coach says: "Break. Stand up. Water. 5 min."

**Why it works:**
- Real ADHD users will recognize this — it's not a gimmick, it's an actual coping technique (Pomodoro + body doubling). Judges who've struggled with focus will smile.
- Demo-wise: type `/focus` mid-pitch, the screen dims, and you say "this is what living with ADHD between visits actually looks like." Memorable.
- It signals you talked to actual users / understand the condition, not just read the spec.

**Build:** ~20 min. CSS transition on a `<div>` overlay, one extra system prompt branch, basic timer. Skip if rushed — but it's the kind of thing that gets remembered.

---

## Pixverse integration (5th sponsor — optional)

Pixverse = text/image → AI video. Two ways to use it, ranked:

### Recommended: pre-pitch "patient narrative" clip (15 min, high ROI)

Generate ONE 8-15 second video clip the night before / morning of pitch. Drop it in slide 1 (Problem) or run it as B-roll while you talk through the setup.

**Prompt to give Pixverse:**
> "Young woman at home desk surrounded by sticky notes, laptop open with too many tabs, looking overwhelmed and unable to start work, soft natural lighting, cinematic, 8 seconds"

**Why this works:** The first 30 seconds of any pitch is where you need emotional buy-in. A real-feeling clip of "Jane" beats a stock photo or text-heavy slide. Zero live demo risk — it's just a video file.

**Add a 2nd clip if time:** "Tired doctor at desk late at night, stack of patient charts, rubbing eyes" — for the provider-pain moment.

### Optional flourish: in-product use (skip unless 30+ min surplus)

When Sentinel completes the first check-in, patient sees a 5-sec AI-generated "you're doing great" visualization in the coach chat. Pitch line: "we use Pixverse to make adherence feel less clinical."

**Honest risk:** ~50% chance this feels gimmicky in a mental health context. Only if (a) you have time AND (b) judges seem product/design-oriented. Read the room.

### What NOT to do
- ❌ Don't try to generate the full demo with Pixverse. Real screen recording > AI fake. Judges can tell.
- ❌ Don't generate clinical content (explainer videos, therapy visualizations). Liability + accuracy + moderation risk.
- ❌ Don't generate provider faces. Keep it stylized / back-of-head / hands-on-keyboard. Avoids the "is that a real doctor" question.

### Mention in pitch
One line near the close: *"Patient narrative clip generated with Pixverse."* Don't oversell — it's polish, not the product.

---

## Demo Runbook

**Total stage time target: 3 minutes.** Most hackathons give 3-5 min. Cut, don't add.

### Pre-flight checklist (run 5 min before pitch)
- [ ] Laptop on stage Wi-Fi (NOT phone hotspot — Retell latency dies)
- [ ] Phone on silent but vibrate ON, fully charged, in your hand
- [ ] Phone number entered into the "trigger Sentinel" button — verify with a test call NOW
- [ ] Browser windows open in this order, ready to alt-tab:
  1. Slides (slide 1)
  2. Clinician dashboard `/clinician/jane-id`
  3. Coach view `/coach/jane-id` with one pre-typed message ready
- [ ] Backup video of Sentinel call queued in a 4th tab — DO NOT close
- [ ] Database has fresh seed data — re-run seed script if you've been testing
- [ ] Coach chat history for Jane has the "can't focus on emails" exchange from earlier (seed it, don't generate live — too slow)
- [ ] Volume up. Test the phone ringer is audible to judges.
- [ ] Close Slack, email, anything that can notify mid-demo

### The script (with timing)

**[0:00-0:30] Problem (slide)**
> "Klarity's own report: 41% of independent practices lose 11 hours a week to admin. 41% say DEA telemedicine rules are their biggest regulatory risk. The 50-minute visit is when treatment decisions get made — but it's everything *between* visits where patients quietly disengage, side effects go unreported, and providers fly blind. That's where we live."

**[0:30-0:45] Setup (switch to clinician dashboard)**
> "Meet Jane. She's 14 days into Adderall XR. Her provider Dr. Reyes has 30 patients today and won't see her for another two weeks. Watch what happens between now and then."

**[0:45-1:30] Sentinel demo (live phone call)**
- Click "Trigger Sentinel Check-in" button on dashboard
- Your phone rings on stage — pick up on speaker, hold near laptop mic
- AI: "Hi Jane, this is Klarity care line checking in on your Adderall — got two minutes?"
- Answer ~3 questions naturally, mention one side effect ("a little appetite suppression")
- Hang up
- > "While we were talking, here's what happened on Dr. Reyes's end."
- Tab to dashboard — SOAP note has populated, risk flag visible
- ⚠️ **If call fails:** "Live demos. Here's what it looks like" → switch to backup video tab. Don't apologize, just keep moving.

**[1:30-2:15] Coach demo**
- Tab to coach view
- > "Jane also messaged the coach this morning. Real ADHD patient text."
- Show pre-seeded message: "I literally cannot start these emails. Been staring 40 min."
- Show coach's reply (already there from seed)
- *Optional easter egg moment:* type `/focus` → screen dims → "this is what living with ADHD between visits actually looks like" → tab away before timer gets boring

**[2:15-2:45] The payoff (back to dashboard)**
- > "Now Dr. Reyes opens Jane's chart. Two weeks of context she didn't have time to read."
- Click "Generate pre-visit brief" (stretch goal) — paragraph appears
- > "Five seconds of reading replaces 20 minutes of chart-digging. Dr. Reyes walks into the visit knowing exactly what to discuss: dose timing, that 3pm crash, the appetite suppression."

**[2:45-3:00] Close**
> "Klarity does the visit. We do everything around it. Voice agents from Retell, backend on InsForge, deployed on Zeabur, all four sponsors in one product. Klarity Companion."

### Q&A prep — likely judge questions

**"How is this different from Blueprint Health / Eleos / existing scribes?"**
> "Scribes document the visit. We extend the practice between visits — outbound monitoring, in-pocket coaching, and pre-visit synthesis. Different product category."

**"Liability when the AI misses suicidal ideation?"**
> "Two layers: real-time risk classifier on every coach response flags + escalates to provider, and Sentinel scripts include PHQ-2 with hardcoded escalation on positive items. We're a *practice extension* with provider-in-the-loop on anything clinical, not autonomous care. Production needs clinical advisory board sign-off — we know."

**"DEA / controlled substance angle — explain."**
> "Telemedicine controlled-substance prescribing requires ongoing monitoring evidence. Sentinel calls are timestamped, recorded, transcribed, and stored — that's audit-ready documentation that didn't exist before. It's compliance-as-a-byproduct."

**"How do you make money?"**
> "Per-active-patient SaaS for practices, like Klarity's existing pricing. ROI is one prevented no-show per patient per month covers it."

**"What if Klarity already has this?"**
> "We're betting they have pieces. Coach as text in the portal, maybe. What they don't have is voice + chat + clinician synthesis as one longitudinal record. Show us yours and we'll integrate."

**"HIPAA?"**
> "Retell is HIPAA-compliant with BAAs. InsForge supports encrypted Postgres. Production needs the BAAs signed and a security review — out of scope for 4 hours, in scope for week 2."

### Demo donts
- Don't read slides
- Don't say "as you can see" — they can't, screens are small
- Don't apologize for what's missing
- Don't go over time. Cut the easter egg before you cut the pre-visit brief.
- Don't let a judge interrupt your phone call demo — it's the showstopper, protect those 45 seconds

---

## Deliverables checklist before demo

- [ ] Public Zeabur URL works
- [ ] InsForge has 3 seeded patients
- [ ] Retell agent configured + webhook firing
- [ ] Coach chat works end-to-end with risk flagging
- [ ] Outbound call → SOAP note → dashboard works in <30s
- [ ] Realtime subscription updates dashboard without refresh
- [ ] Slides done, demo script rehearsed twice
- [ ] Backup plan: if Retell call fails live, have a pre-recorded video clip ready
