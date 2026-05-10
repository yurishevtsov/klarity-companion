import Link from "next/link";

type PatientPageProps = {
  params: Promise<{ patientId: string }>;
};

export default async function PatientPage({ params }: PatientPageProps) {
  const { patientId } = await params;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <Link
        href="/clinician"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Patients
      </Link>

      <header className="mt-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Patient · <code className="font-mono normal-case">{patientId}</code>
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Overview</h1>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="bg-card text-card-foreground rounded-2xl border p-5">
          <h2 className="text-sm font-medium">Recent Coach chat</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Last 24h, flagged messages highlighted.
          </p>
        </div>
        <div className="bg-card text-card-foreground rounded-2xl border p-5">
          <h2 className="text-sm font-medium">Sentinel calls</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Auto-generated SOAP notes per call.
          </p>
        </div>
        <div className="bg-card text-card-foreground rounded-2xl border p-5">
          <h2 className="text-sm font-medium">At a glance</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Current meds, days on med, last touchpoint, risk flag.
          </p>
        </div>
      </section>

      <p className="mt-12 text-xs text-muted-foreground">
        Live data + realtime updates ship in Phase 3.
      </p>
    </main>
  );
}
