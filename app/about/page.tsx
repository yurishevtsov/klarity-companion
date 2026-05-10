import Image from "next/image";
import Link from "next/link";
import { KlarityMark } from "@/components/klarity-mark";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "About — Klarity Companion",
  description:
    "Proof-of-concept AI care layer for the time between psychiatric visits. Built for Build Smth AI-Native @ Cal.",
};

function Section({
  title,
  eyebrow,
  children,
  className,
}: {
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-12", className)}>
      {eyebrow && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 className="mb-4 text-xl font-semibold tracking-tight">{title}</h2>
      )}
      <div className="space-y-3 text-[15px] leading-relaxed text-foreground">
        {children}
      </div>
    </section>
  );
}

function Surface({
  dotColor,
  label,
  title,
  children,
}: {
  dotColor: string;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card text-card-foreground rounded-2xl border p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: dotColor }}
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
      </div>
      <h3 className="mt-2 text-base font-semibold">{title}</h3>
      <div className="mt-2 space-y-2 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <KlarityMark showWordmark={false} />
        <span>Klarity Companion</span>
      </Link>

      <header className="mt-6">
        <div className="flex items-baseline gap-2">
          <Image
            src="/klarity-brand.svg"
            alt="Klarity"
            width={88}
            height={28}
            unoptimized
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground translate-y-[-2px]">
            Companion
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance">
          A proof-of-concept AI care layer for the time{" "}
          <span style={{ color: "var(--brand-blue)" }}>between visits</span>.
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Built in May 2026 at <strong>Build Smth AI-Native @ Cal</strong> on the Klarity track, with Retell, Zeabur, and InsForge as backend sponsors.
          The 50-minute appointment is when treatment decisions get made. Everything
          between visits is when patients quietly disengage, side effects go
          unreported, and providers fly blind. This is three coordinated surfaces
          designed to fill that gap, share data with each other, and surface what
          matters to the clinician.
        </p>
      </header>

      <Section eyebrow="What we built" title="Three surfaces, one record">
        <div className="grid gap-4 md:grid-cols-3 mt-2">
          <Surface
            dotColor="var(--brand-blue)"
            label="Patient · Text"
            title="Coach"
          >
            <p>ADHD/psych-aware AI companion. CBT techniques, task breakdown, body-doubling, medication-aware nudges.</p>
            <p>Crisis escalation, in-stream + out-of-band risk classifier, opt-out privacy toggle, &quot;/focus&quot; hyperfocus mode.</p>
          </Surface>
          <Surface
            dotColor="var(--brand-blue-soft)"
            label="Patient · Voice"
            title="Sentinel"
          >
            <p>Scheduled outbound check-ins on day 7 / 14 / 30. PHQ-2, side-effect screen, sleep, appetite, diversion-risk.</p>
            <p>Post-call SOAP notes generated in ~6 seconds. Phone or in-browser web call.</p>
          </Surface>
          <Surface
            dotColor="var(--brand-cyan)"
            label="Provider"
            title="Clinician dashboard"
          >
            <p>Patient roster sorted by risk. Three-column per-patient view: chat, calls + SOAP, at-a-glance med list.</p>
            <p>Pre-visit brief synthesizes 14 days of context into a 5-second read.</p>
          </Surface>
        </div>
      </Section>

      <Section eyebrow="Strategic fit" title="How it would help Klarity">
        <p>Mapped to findings from Klarity&apos;s State of Independent Practice report:</p>
        <ul className="ml-5 list-disc space-y-1.5 text-[15px]">
          <li>
            <strong>41%</strong> of practices lose 11+ hours/week to admin → auto SOAP saves 5–10 min per check-in; pre-visit brief replaces ~20 min of chart-digging with 5 seconds of reading
          </li>
          <li>
            <strong>41%</strong> cite DEA telemedicine rules as their #1 regulatory risk → every Sentinel call is timestamped, recorded, transcribed, stored — audit-ready monitoring evidence for controlled-substance prescribing
          </li>
          <li>
            <strong>36%</strong> use no AI tools today → first-touch is low-stakes (a coaching chat, a structured check-in call) with provider-in-the-loop on anything clinical
          </li>
          <li>
            <strong>90%</strong> expect patient volume to grow in 2026 → between-visit care scales per patient at marginal cost rather than bounded by clinician hours
          </li>
        </ul>
        <p className="mt-3 pt-3 border-t text-muted-foreground text-sm">
          Vs existing scribes (Blueprint, Eleos): <em>they document the visit.</em> Klarity Companion <em>extends the practice between visits as a longitudinal record.</em> Different product category, complementary stack.
        </p>
      </Section>

      <Section eyebrow="Tech & sponsors" title="Built on four sponsors">
        <ul className="ml-5 list-disc space-y-1 text-[15px]">
          <li><strong>Klarity</strong> — track + brand</li>
          <li><strong>Retell AI</strong> — HIPAA-compliant voice agent for Sentinel calls</li>
          <li><strong>Zeabur</strong> — hosting (Lightsail-backed server) + AI Hub (unified Claude/Kimi/etc. gateway, OpenAI-compatible)</li>
          <li><strong>InsForge</strong> — Postgres backend, server-side SDK, edge functions</li>
        </ul>
        <p className="mt-2 text-sm text-muted-foreground">
          Frontend: Next.js 16 + React 19 + Tailwind v4 + shadcn/ui. Coach uses Claude Haiku 4.5 for ~700ms first-byte streaming. SOAP and pre-visit brief use Claude Sonnet 4.5. All AI traffic routed through Zeabur AI Hub via Vercel AI SDK 6. Risk classification runs as a separate post-stream call for two-layer safety.
        </p>
      </Section>

      <Section eyebrow="Important caveats" title="This is a proof of concept" className="rounded-2xl border bg-amber-500/[0.03] dark:bg-amber-500/[0.04] p-6 mt-12">
        <p>
          Before any real-world clinical deployment, all of the following would need genuine discussion, evaluation, and sign-off:
        </p>

        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="font-semibold text-foreground">HIPAA &amp; data handling</p>
            <p className="text-muted-foreground">
              Retell offers BAAs and InsForge supports encrypted Postgres, but production deployment requires signed BAAs across every vendor in the data path, encryption at rest, comprehensive audit logging, role-based access controls (the demo hardcodes Dr. Reyes — real auth is out of scope for a 4-hour build), data retention policies, and a security review by a qualified party.
            </p>
          </div>

          <div>
            <p className="font-semibold text-foreground">AI accuracy and clinical safety</p>
            <p className="text-muted-foreground">
              Coach replies are language-model output — informed coaching, not medical advice. SOAP note generation needs clinician review before becoming part of a patient record. The risk classifier achieves a baseline level of safety but is not a substitute for trained clinical judgment; false negatives are inevitable. Production would require a clinical advisory board to sign off on the system prompt, escalation rules, edge cases, and acceptable failure modes.
            </p>
          </div>

          <div>
            <p className="font-semibold text-foreground">Provider-in-the-loop is non-negotiable</p>
            <p className="text-muted-foreground">
              This is a practice extension, not autonomous care. Every clinically significant signal is meant to surface to a human provider for action. The AI does not prescribe, diagnose, or take care decisions independently.
            </p>
          </div>

          <div>
            <p className="font-semibold text-foreground">Patient privacy</p>
            <p className="text-muted-foreground">
              The opt-out toggle is a starting point, not a complete privacy story. A real-world review would need to consider data minimization, consent flows (especially for minors), audit visibility, and whether voluntary opt-out is sufficient or jurisdictional opt-in is required.
            </p>
          </div>

          <div>
            <p className="font-semibold text-foreground">Crisis intervention</p>
            <p className="text-muted-foreground">
              Two-layer escalation (in-stream + out-of-band classifier) and 988 surfacing are not a substitute for trained crisis intervention. Production needs a documented escalation pathway with clinical staffing.
            </p>
          </div>

          <div>
            <p className="font-semibold text-foreground">Demo data</p>
            <p className="text-muted-foreground">
              All three patients (Jane Doe, Marcus Reed, Jordan Patel) and every interaction shown are synthetic. No real patient data was used.
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground border-t pt-3 border-amber-500/20">
          We&apos;d need genuine discussion and evaluation around what&apos;s safe and feasible from a HIPAA, regulatory, and clinical safety standpoint before any path toward production. This build is a working argument that the concept is viable — not the production system.
        </p>
      </Section>

      <footer className="mt-16 border-t pt-6 text-xs text-muted-foreground">
        <p>
          Built by Yuri Shevtsov (with generous assistance from Claude Code) — Build Smth AI-Native @ Cal, Klarity track, May 2026.{" "}
          <a
            href="https://github.com/yurishevtsov/klarity-companion"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Source on GitHub
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
