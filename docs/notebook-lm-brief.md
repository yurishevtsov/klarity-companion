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

### Mind Map (use for the architecture infographic)

In NotebookLM Studio, click **Mind Map** and prompt:

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

Export at high resolution and drop into the architecture slide.

### Video Overview (2–3 minute narrated explainer)

In NotebookLM Studio → **Generate → Video Overview**. Customize:

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

### Audio Overview (post-pitch shareable, optional)

Default Audio Overview button — produces a 6–9 minute conversation between
two AI hosts. Useful as a "leave-behind" link to share with Klarity / VCs
after the pitch.

### Briefing Doc (optional 1-pager)

Studio → Briefing Doc. Generates a polished one-page summary that pairs
well with the Audio Overview as a written companion.

### FAQ (Q&A prep, optional)

Studio → FAQ. Generates anticipated questions from the source. Rehearse
your answers against this list — it tends to surface the same questions
judges actually ask.

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
