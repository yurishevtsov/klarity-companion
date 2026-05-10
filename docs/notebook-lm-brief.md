# Klarity Companion — NotebookLM source brief

Paste the section below into a NotebookLM project as a "Note" (or upload as a `.md` source).
Then use the generation prompts at the bottom for the infographic + video overview.

---

## Source brief

**Klarity Companion — AI care layer between psychiatric visits**

Klarity Companion extends a telehealth practice's reach into the time
patients are *not* in a visit. The 50-minute appointment is when treatment
decisions get made. Everything between visits is when patients silently
disengage, side effects go unreported, and providers fly blind.

### Three surfaces

1. **Coach (inbound, text).** Patients open a chat anytime and talk to an
   ADHD/psych-aware AI coach. Uses CBT-style techniques, task breakdown,
   body-doubling cues, medication-aware nudges. Crisis escalation triggers
   flag the conversation for the provider and surface 988. Built on Claude
   Haiku 4.5 (snappy, ~700ms first-byte) routed through Zeabur AI Hub.
   Every assistant turn is also passed through a separate risk classifier
   that tags the conversation in the clinician dashboard.

2. **Sentinel (outbound, voice).** Scheduled phone or web check-in calls on
   days 7, 14, and 30 post-prescription. Powered by Retell AI's
   HIPAA-compliant voice agent. Asks 6–8 structured questions: PHQ-2,
   side-effect screen, sleep, appetite, and (for stimulants) diversion
   risk. Post-call, the transcript routes to a Claude Sonnet 4.5 SOAP note
   generator that produces structured Subjective / Objective / Assessment /
   Plan notes plus risk flags. SOAP lands on the dashboard ~6 seconds
   after the call ends.

3. **Clinician dashboard.** Single page per patient with three columns:
   recent coach chat (flagged messages highlighted), Sentinel call
   history with auto-generated SOAP notes, at-a-glance med list with
   day counters and risk badge. A pre-visit brief generator synthesizes
   14 days of context into a 4–6 sentence primer the provider reads in
   5 seconds before walking into the visit.

### Why it wins

- Hits all 5 Klarity strategic metrics: revenue (retention via
  engagement), retention (between-visit touchpoints), satisfaction
  (always-on care), efficiency (auto-generated SOAP saves provider
  charting time), compliance (every Sentinel call is a timestamped,
  recorded, audit-ready DEA monitoring artifact for controlled
  substance prescribing).
- Differentiated from existing scribes (Blueprint, Eleos): scribes
  document the visit; Klarity Companion extends the practice between
  visits as a longitudinal record.
- Built on 4 sponsors: **Klarity** (track), **Retell** (voice),
  **Zeabur** (hosting + AI Hub), **InsForge** (Postgres + auth + edge
  functions + realtime backend).

### Key numbers from Klarity's State of Independent Practice report

- 41% of independent practices lose 11+ hours per week to admin
- 41% cite DEA telemedicine rules as their primary regulatory risk
- 36% use no AI tools today
- 90% expect patient volume to grow in 2026

### One-liner

> "Klarity does the visit. We do everything between visits."

### Demo cast (used in screenshots and the live walkthrough)

- **Jane Doe** — patient, day 14 of Adderall XR 20mg. Demo subject for
  the live Sentinel call.
- **Marcus Reed** — second patient, used to demonstrate the safety /
  risk-flag pipeline (suicidal ideation + medication misuse exchange).
- **Jordan Patel** — third patient, kept clean to show the "OK / quiet"
  baseline state.
- **Dr. Maya Reyes** — the supervising provider Dr. Chen-style placeholder.

---

## Generation prompts

NotebookLM ships several output types in the Studio panel. Below are
prompts tuned for each, with **multiple variants where audience matters**.
All assume the source brief above is loaded as a Note in your project.

> **General tip:** every NotebookLM output is grounded in the sources
> you've added. The prompts below assume the source brief is the *only*
> source. If you also add the live demo URL or PR descriptions, you'll
> get richer outputs but lose some control over emphasis.

---

### 🧠 Mind Map (visual hierarchy of concepts)

Click **Mind Map** in the Studio panel. Pick the variant matching what
you want to land on the slide.

#### Variant A — Architecture (recommended for the deck)

```
Generate a mind map showing how Klarity Companion connects three surfaces
(Coach, Sentinel, Clinician dashboard) to four sponsor technologies
(Retell, Zeabur, InsForge, Klarity), and how data flows between them.
Center the map on "Klarity Companion." First-level branches: the three
surfaces. Second-level: what each surface does (specific functions like
"PHQ-2", "SOAP generation", "risk classifier", "pre-visit brief").
Third-level: the underlying tech for each ("Retell voice agent",
"Zeabur AI Hub → Claude Sonnet 4.5", "InsForge Postgres", etc.).
Highlight the data flow between Coach and Clinician dashboard, and
between Sentinel and Clinician dashboard.
```

#### Variant B — Strategic fit (maps Klarity's pain points to features)

```
Generate a mind map with two parallel columns of branches connected by
arrows. LEFT column: Klarity's State of Independent Practice pain points
(41% lose 11+ hrs/week to admin, 41% cite DEA telemedicine rules as
top regulatory risk, 36% use no AI tools, 90% expect patient volume
growth in 2026). RIGHT column: corresponding Klarity Companion features
(auto-generated SOAP saves 5-10 min/check-in, audit-ready Sentinel call
recordings as DEA monitoring evidence, low-stakes provider-in-the-loop
AI exposure, between-visit care that scales per-patient at marginal
cost). Connect each pain point to its corresponding feature. Title the
map "Strategic fit."
```

#### Variant C — Patient journey (good for storytelling slides)

```
Generate a mind map showing the patient's journey across all three
surfaces over 30 days. Center node: "Patient (post-prescription)."
Branches in chronological order: Day 0 (initial visit, prescription
written), Day 1-6 (Coach available 24/7 for executive-function support
+ medication-aware nudges), Day 7 (Sentinel call #1 — PHQ-2 + side-
effect screen), Day 8-13 (Coach continues; flagged messages surface
to provider), Day 14 (Sentinel call #2), Day 15-29 (provider can reply
in same Coach thread), Day 30 (Sentinel call #3 + pre-visit brief
generated for next appointment). Show what data is captured at each
step and where it surfaces for the clinician.
```

Export the rendered map at high resolution and drop into a slide.

---

### 🎥 Video Overview (narrated slideshow, ~2-4 min)

Click **Generate → Video Overview**. Customize per audience:

#### Variant A — Investor / strategic decision-maker (recommended)

```
Generate a 2-3 minute video overview targeted at investors and clinical
informatics leaders, NOT at end patients. Lead with the problem: what
happens to psychiatric patients in the time between visits. Then introduce
Klarity Companion as the care layer that fills that gap. Walk through
the three surfaces in order — Coach (text), Sentinel (voice), Clinician
dashboard — explaining what each does and the data each generates. Close
with the compliance angle (DEA monitoring evidence, audit-ready Sentinel
transcripts) and the four-sponsor architecture story. Tone: confident,
clinical, not gimmicky. Avoid mental health stigma framing. Frame ADHD
and psychiatric medication management as ongoing care work, not crisis
intervention.
```

#### Variant B — Engineering / technical hiring manager

```
Generate a 3-4 minute technical video overview targeted at engineers
evaluating the project's technical merit. Lead with the architecture
challenge — coordinating three real-time surfaces (text, voice, dashboard)
across four vendor systems while keeping the data model simple. Walk
through the major technical decisions: why @ai-sdk/openai-compatible
instead of strict @ai-sdk/openai (Zeabur's chunk-id format), why
claude-haiku for chat and sonnet for SOAP (reasoning-model latency
trade-offs), why a single uuid grouping for sessions instead of a
separate sessions table (simpler reads, cheaper schema), why polling
post-call instead of true realtime (~6s SOAP gen lands within polling
window with no infra cost). Close with the lessons learned. Tone:
peer-to-peer, no marketing fluff. Target audience already knows what
Postgres and middleware are.
```

#### Variant C — Klarity team / clinical-product audience

```
Generate a 2-3 minute video overview targeted at the Klarity product
and clinical operations team. Frame this as "here's what we built that
could plug into your existing practice workflow." Lead with the alignment
to Klarity's State of Independent Practice findings (admin burden, DEA
compliance pressure). Show how the three surfaces complement (not
replace) Klarity's existing visit infrastructure. Emphasize provider-in-
the-loop everywhere — this is a practice extension, never autonomous
care. Close with what would need to happen for this to move beyond
proof-of-concept (BAAs, clinical advisory board sign-off, security
review). Tone: collaborative, deferential to clinical expertise, but
confident in the engineering.
```

---

### 🎙️ Audio Overview (two-AI-host conversation, ~5-9 min)

Default button generates a casual two-host explainer. Customize for
audience and length. Audio Overviews are great as **post-pitch
leave-behinds** — share the URL with anyone who wants depth without
reading.

#### Variant A — Pitch companion (5-7 min, investor tone)

```
Generate a 5-7 minute audio overview targeted at investors and
healthcare-tech evaluators. The two hosts should treat this as a serious
case study, not a fluff explainer. Open with one host explaining the
problem (between-visit care gap in psychiatric telehealth) and the
other pushing back: "but doesn't every telehealth platform claim this?"
Use that tension to walk through what's actually differentiated about
Klarity Companion (longitudinal record vs. visit-only documentation,
voice + text + dashboard as one loop, audit-ready DEA compliance
evidence). Cover the four-sponsor architecture briefly. End with the
proof-of-concept caveats — what would still need to happen before
production, including HIPAA, clinical advisory sign-off, and AI
accuracy validation. Tone: peer experts having a real conversation,
not promotional.
```

#### Variant B — Skeptical clinician roleplay (8-9 min, deeper safety)

```
Generate an 8-9 minute audio overview where one host is a curious
healthcare executive and the other is a board-certified psychiatrist
who is initially skeptical of AI in clinical workflows. The
psychiatrist should ask the hard questions: How does the risk
classifier handle false negatives? What happens when the AI gives bad
medication advice? Who is liable when the SOAP note is wrong? What
about patient autonomy when the AI can flag conversations to the
provider? The executive should walk through Klarity Companion's
specific design choices that address each concern (in-stream + out-of-
band two-layer escalation, provider-in-the-loop on everything
clinical, opt-out privacy toggle, SOAP requires clinician review
before EHR ingestion). End with the psychiatrist saying what would
need to be true before they'd actually use this in their practice.
Tone: substantive professional dialogue, not a sales pitch.
```

#### Variant C — Quick demo intro (2-3 min, hands the baton to live walkthrough)

```
Generate a 2-3 minute audio overview designed to play BEFORE a live
demo, NOT to replace it. Get the audience emotionally invested in the
problem in the first 30 seconds (a patient stuck staring at email
they can't start; a provider walking into a follow-up with no context
on the prior two weeks). Briefly name the three surfaces (Coach,
Sentinel, Clinician dashboard) without going deep. End with a direct
hand-off: "...and what you're about to see live is exactly that loop
in action." Tone: warm, inviting, sets emotional context. Hosts should
be conversational, not lecturing.
```

---

### 📄 Briefing Doc (written 1-page summary)

Click **Briefing Doc**. Briefing Docs pair well with Audio Overviews as
written companions. Customize for who'll read it.

#### Variant A — Generic 1-pager (default share)

```
Generate a polished one-page briefing document covering: (1) the problem
in 1-2 sentences, (2) what Klarity Companion does in 3 sentences with
the three surfaces named, (3) how it differs from existing scribes
(scribes document the visit; this extends the practice between visits)
in one sentence, (4) the four sponsor stack (Klarity, Retell, Zeabur,
InsForge), (5) the proof-of-concept caveats covering HIPAA, AI safety,
and provider-in-the-loop. Use clean markdown headings, bullet lists
where appropriate, no marketing buzzwords. Imagine this is being shared
with someone who has 60 seconds to read it.
```

#### Variant B — Investor 1-pager (executive summary tone)

```
Generate a one-page investor briefing covering: market context (citing
the State of Independent Practice numbers — 41% admin burden, 41% DEA
risk, 90% growth expectation), product summary, differentiation versus
existing scribes (Blueprint, Eleos), revenue model hypothesis (per-
active-patient SaaS, ROI = one prevented no-show per patient per month),
tech stack, and the proof-of-concept caveats. Format: executive summary
at top, then sections. Tone: confident but honest about what's still
unproven (clinical sign-off, real-world safety validation, BAAs).
```

#### Variant C — Clinical leader brief (provider workflow lens)

```
Generate a one-page briefing for a clinical operations leader
evaluating whether this could fit into their practice. Open with how
the three surfaces fit into a typical psychiatric follow-up workflow
(not how they replace it). Cover what data the provider sees (chat
summaries, SOAP notes, pre-visit brief, risk badges), what the patient
experiences (24/7 coach, scheduled check-ins, privacy controls), and
the explicit handoff points where AI surfaces something to a human.
Spend at least one paragraph on safety (two-layer crisis escalation,
provider-in-the-loop policy, what the AI deliberately does NOT do).
Close with what would need to happen before pilot deployment (BAAs,
clinical advisory sign-off, integration with the practice's EHR).
```

#### Variant D — Engineering 1-pager (technical hiring or onboarding)

```
Generate a one-page technical brief covering: data model (5 InsForge
tables — patients, chat_messages with session_id grouping, calls,
clinician_notes, access_log), the LLM routing decisions (Haiku for
chat, Sonnet for SOAP, why not Kimi K2.6), the streaming protocol
issue with @ai-sdk/openai vs @ai-sdk/openai-compatible, the post-call
polling pattern (~6s SOAP gen lands within 30s polling window with no
realtime infra), the BlackHole virtual-mic gotcha and the captureDeviceId
fix, the Zeabur Lightsail Dockerfile + port-8080 quirk. Tone: technical,
no marketing. Format: short sections with concrete code/file references
where relevant.
```

---

### ❓ FAQ (anticipated questions, Q&A prep)

Click **FAQ**. Use this for pitch rehearsal — it surfaces the questions
judges actually ask.

#### Variant A — Judge / panel Q&A prep

```
Generate a FAQ targeted at hackathon judges and a Q&A panel. Anticipate
hard questions across these dimensions: (1) Differentiation — how is
this different from Blueprint Health, Eleos, or any existing AI scribe?
(2) Safety — what happens when the AI misses suicidal ideation? Who's
liable? (3) HIPAA — does this work in a real practice? (4) Klarity
specifically — what if Klarity already has some of this internally?
(5) Business model — how do you make money? (6) Technical — why these
four sponsors and not others? (7) AI accuracy — how good is the SOAP
generation actually? Generate 12-18 questions with substantive answers
that anticipate follow-ups. Don't sugar-coat — if a question doesn't
have a great answer, name the gap honestly.
```

#### Variant B — Patient-facing FAQ (if shared with end users)

```
Generate a FAQ targeted at a patient who has been told their psychiatric
practice is going to add Klarity Companion to their care. Anticipate
their questions across: (1) Privacy — who can see my chats? (2) Trust
— is the AI my therapist? (3) Mechanics — when do calls happen, can I
opt out? (4) Crisis — what happens if I'm having a really bad day?
(5) Provider relationship — does this mean my doctor isn't going to see
me as much? Tone: warm, plainspoken, no clinical jargon, no marketing.
Each answer should be 2-4 sentences, addressed directly to the patient.
End with a clear "you can always talk to your provider directly" note.
```

---

### 📚 Study Guide (for deep onboarding, optional)

Click **Study Guide**. Useful if you ever onboard a teammate or hand
off the project for continuation.

```
Generate a study guide for someone who needs to deeply understand the
Klarity Companion architecture and decisions. Structure it as: (1)
Concepts to master before reading the code (telehealth between-visit
care gap, PHQ-2 screening, SOAP note structure, DEA telemedicine
prescribing rules, risk-flagging in clinical chat). (2) Walk-through
order for understanding the codebase (start with the data model, then
the three API routes per surface, then the UI components). (3) Key
decisions and the trade-offs behind them (LLM model selection, session
data model, polling vs. realtime, web vs. phone calls). (4) Active
gotchas (BlackHole mic capture, Zeabur PORT injection, NOT NULL session_id,
Postgres VOLATILE in joins, strict OpenAI provider rejecting Zeabur AI
Hub chunk IDs). (5) Open questions for production readiness. Format
with section numbering and short summaries.
```

---

### 🗓️ Timeline (chronological build view, optional)

Click **Timeline**. NotebookLM extracts time-ordered events from sources.
Useful for retrospective decks or "how did we get here" narratives.

```
Generate a timeline of the Klarity Companion build process showing how
features and decisions came together. Structure: (1) Phase 0 — bootstrap
(Next.js scaffolding, Dockerfile for Zeabur, InsForge schema design).
(2) Phase 1 — Coach (streaming chat, model selection wars, risk
classifier as second layer). (3) Phase 2 — Sentinel (web call mode
because phone numbers couldn't be purchased, SOAP generation, mic
device picker after the BlackHole bug). (4) Phase 3 — Clinician dashboard
(risk badges, session tiles, pre-visit brief stretch goal). (5) Polish
(disclaimer modal, demo restore, access logging). For each phase, list
the key technical decisions and any gotchas resolved during it. End
with the demo readiness state.
```

---

### Quick reference — which output for which use case?

| Output type | Best for | Length |
|---|---|---|
| Mind Map | Slide infographics, architecture diagrams | one image |
| Video Overview | Replacing the live demo (e.g., asynchronous share) | 2-4 min |
| Audio Overview (Variant A) | Post-pitch shareable, deep-but-easy listen | 5-7 min |
| Audio Overview (Variant B) | Investor + clinical advisor proof point | 8-9 min |
| Audio Overview (Variant C) | Demo opener (B-roll under your slide 1) | 2-3 min |
| Briefing Doc (Variant A) | Generic share — Slack, email | 1 page |
| Briefing Doc (Variant B) | VC follow-up | 1 page |
| Briefing Doc (Variant C) | Klarity team / clinical operations lead | 1 page |
| Briefing Doc (Variant D) | Engineering hiring / contractor handoff | 1 page |
| FAQ (Variant A) | Pitch Q&A rehearsal | 12-18 questions |
| FAQ (Variant B) | Patient-facing if you ever ship | 8-12 questions |
| Study Guide | Teammate onboarding | multi-section |
| Timeline | Retrospective deck or progress story | chronological |

---

## Image-generation prompts (Pixverse / Midjourney / DALL-E / Imagen)

### Slide 1 — the problem (patient side)

> Soft cinematic illustration of a young woman at a home desk surrounded
> by colorful sticky notes, laptop screen showing too many browser tabs,
> head in one hand, looking overwhelmed and unable to start. Late
> afternoon natural light through a window. Cool blue and cyan accents,
> mostly muted neutrals. Clean editorial style, slight grain. Negative
> space for text overlay on the right. --ar 16:9

### Slide 1 alt — the problem (provider side)

> Soft editorial illustration of a tired doctor in scrubs at a desk late
> at night, only a desk lamp lit, stack of patient charts on one side,
> laptop showing a patient EHR, rubbing eyes with one hand. Hands and
> the back of the head visible — face turned away. Cool blue and cyan
> tones. Clean magazine-style art, no logos. --ar 16:9

### Slide 2 — the gap (conceptual)

> Minimal vector infographic showing a horizontal timeline. Two thin
> rectangles labeled "VISIT" — small, far apart. Between them, a wide
> gap labeled "between visits." Subtle blue dots and lines crossing the
> gap. White background, electric blue (#0E62F4) and cyan (#61EFE9)
> accents. Clean editorial, professional medical-tech feel. --ar 16:9

### Slide 5 — the outcome

> Soft illustration of a young woman in the same kitchen-office space
> from earlier, now sitting upright at the laptop, calmer expression,
> one tab focused, plant in the corner. Same color palette — cool blues
> and cyan. Same editorial cinematic style. Negative space top-right
> for "What's next" text. --ar 16:9

### Pixverse 8-second video clip (for slide 1 B-roll)

> 8-second cinematic video. Young woman at home desk, soft natural
> light, surrounded by sticky notes and a laptop with too many tabs
> open. Subtle camera push-in on her face as she looks overwhelmed
> and stuck. Soft ambient lighting, muted cool blue tones, no music.
> Editorial style. --duration 8

---

## Style notes (apply to all image prompts)

- Stylized illustration > photorealistic. AI photos of humans look
  uncanny on a 60" projector and judges notice.
- Always end with `--ar 16:9` for fullscreen slide art.
- Drop "cool blue and cyan tones, white space" into every prompt to
  match the Klarity palette so the AI art doesn't fight your UI
  screenshots.
