import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { KlarityMark } from "@/components/klarity-mark";
import DemoResetButton from "./DemoResetButton";

export default function Home() {
  return (
    <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      {/* Subtle brand glow behind hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-72 w-[42rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--brand-cyan), transparent 70%)",
        }}
      />

      <KlarityMark />

      <h1 className="mt-5 text-5xl font-semibold tracking-tight text-balance leading-[1.05]">
        Continuous care, <span style={{ color: "var(--brand-blue)" }}>between visits.</span>
      </h1>
      <p className="mt-5 max-w-xl text-base text-muted-foreground">
        AI care layer for psych and ADHD telehealth practices. A coach in the
        patient&apos;s pocket, scheduled voice check-ins, and a unified clinician
        dashboard — so the work between appointments stops being invisible.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="group bg-card text-card-foreground rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--brand-blue)" }}
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Patient surface
            </p>
          </div>
          <h2 className="mt-2 text-lg font-semibold">Coach &amp; Sentinel</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inbound text coach + outbound voice check-ins.
          </p>
          <Link
            href="/coach/jane"
            className={buttonVariants({ size: "lg", className: "mt-5 w-full" })}
          >
            Open Coach (demo)
          </Link>
        </div>

        <div className="group bg-card text-card-foreground rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--brand-cyan)" }}
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Clinician view
            </p>
          </div>
          <h2 className="mt-2 text-lg font-semibold">Patient roster</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Risk badges, longitudinal context, pre-visit brief.
          </p>
          <Link
            href="/clinician"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-5 w-full" })}
          >
            Open Dashboard
          </Link>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Demo data only. Not a substitute for medical advice. If in crisis, call or text 988.
        </p>
        <DemoResetButton />
      </div>
    </main>
  );
}
