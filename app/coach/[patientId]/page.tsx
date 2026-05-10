import Link from "next/link";

type CoachPageProps = {
  params: Promise<{ patientId: string }>;
};

export default async function CoachPage({ params }: CoachPageProps) {
  const { patientId } = await params;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <Link
        href="/"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Klarity Companion
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Coach
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Patient: <code className="font-mono">{patientId}</code>
      </p>

      <div className="bg-card text-card-foreground mt-8 rounded-2xl border p-6">
        <p className="text-sm text-muted-foreground">
          Chat interface ships in Phase 1. The patient will type here and the
          coach will reply with CBT-style nudges, task breakdowns, and risk
          escalation when warranted.
        </p>
      </div>
    </main>
  );
}
