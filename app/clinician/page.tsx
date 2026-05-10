import Link from "next/link";
import { listPatients, type Patient } from "@/lib/patients";
import { getPatientRiskSummary, type RiskSummary } from "@/lib/chat";
import { RiskBadge } from "@/components/risk-badge";
import { KlarityMark } from "@/components/klarity-mark";

// Always render fresh — chat history changes between visits.
export const dynamic = "force-dynamic";

function formatTouchpoint(iso: string | null): string {
  if (!iso) return "no recent activity";
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function summarizeMeds(meds: Patient["current_meds"]): string {
  if (meds.length === 0) return "no meds on file";
  return meds.map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ""}`).join(" + ");
}

const SORT_PRIORITY: Record<RiskSummary["level"], number> = { high: 0, medium: 1, low: 2 };

export default async function ClinicianPage() {
  const patients = await listPatients();
  const enriched = await Promise.all(
    patients.map(async (p) => ({ patient: p, summary: await getPatientRiskSummary(p.id) }))
  );

  // High risk first, then medium, then low; within a tier, most-recent activity first.
  enriched.sort((a, b) => {
    const tier = SORT_PRIORITY[a.summary.level] - SORT_PRIORITY[b.summary.level];
    if (tier !== 0) return tier;
    const aT = a.summary.lastTouchpoint ?? "";
    const bT = b.summary.lastTouchpoint ?? "";
    return bT.localeCompare(aT);
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <KlarityMark showWordmark={false} />
        <span>Klarity Companion</span>
      </Link>

      <header className="mt-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Dr. Maya Reyes — Today
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Patients</h1>
        </div>
        <p className="text-xs text-muted-foreground">{enriched.length} active</p>
      </header>

      <ul className="mt-8 grid gap-3">
        {enriched.map(({ patient, summary }) => (
          <li key={patient.id}>
            <Link
              href={`/clinician/${patient.slug ?? patient.id}`}
              className="bg-card text-card-foreground flex items-center justify-between rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{patient.name}</p>
                  <RiskBadge level={summary.level} />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {patient.conditions.join(" · ") || "no conditions"} · {summarizeMeds(patient.current_meds)}
                </p>
                {summary.recentRiskFlags.length > 0 && (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 [overflow-wrap:anywhere]">
                    flags: {summary.recentRiskFlags.join(", ").replace(/_/g, " ")}
                  </p>
                )}
              </div>
              <div className="ml-4 shrink-0 text-right">
                <p className="text-xs text-muted-foreground">{formatTouchpoint(summary.lastTouchpoint)}</p>
                {summary.totalMessages > 0 && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{summary.totalMessages} msg/wk</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-xs text-muted-foreground">
        Sorted by risk, then most recent activity. Live realtime ships in a follow-up.
      </p>
    </main>
  );
}
