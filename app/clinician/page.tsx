import Link from "next/link";

const SEED_PATIENTS = [
  { id: "sarah", name: "Sarah Chen", age: 28, summary: "ADHD · Adderall XR 20mg · day 14" },
  { id: "marcus", name: "Marcus Reed", age: 34, summary: "ADHD + GAD · Vyvanse 30mg + Lexapro 10mg" },
  { id: "jordan", name: "Jordan Patel", age: 22, summary: "MDD · Wellbutrin 150mg · day 7" },
];

export default function ClinicianPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <Link
        href="/"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Klarity Companion
      </Link>

      <header className="mt-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Dr. Chen — Today
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Patients</h1>
        </div>
        <p className="text-xs text-muted-foreground">{SEED_PATIENTS.length} active</p>
      </header>

      <ul className="mt-8 grid gap-3">
        {SEED_PATIENTS.map((p) => (
          <li key={p.id}>
            <Link
              href={`/clinician/${p.id}`}
              className="bg-card text-card-foreground flex items-center justify-between rounded-2xl border p-5 transition-colors hover:bg-accent"
            >
              <div>
                <p className="font-medium">{p.name}, {p.age}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{p.summary}</p>
              </div>
              <span className="text-xs text-muted-foreground">View →</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-xs text-muted-foreground">
        Live patient list ships in Phase 3 (InsForge realtime).
      </p>
    </main>
  );
}
