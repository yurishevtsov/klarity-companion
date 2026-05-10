import Link from "next/link";
import { notFound } from "next/navigation";
import { getPatient, type Patient } from "@/lib/patients";
import { loadHistory, getPatientRiskSummary, isFlagged } from "@/lib/chat";
import { RiskBadge } from "@/components/risk-badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PatientPageProps = {
  params: Promise<{ patientId: string }>;
};

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function formatRelative(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function MedSummary({ patient }: { patient: Patient }) {
  if (patient.current_meds.length === 0) {
    return <p className="text-xs text-muted-foreground">No meds on file.</p>;
  }
  return (
    <ul className="space-y-2 text-xs">
      {patient.current_meds.map((m, idx) => {
        const days = daysSince(m.started_at);
        return (
          <li key={idx} className="flex items-baseline justify-between gap-3">
            <span>
              <span className="font-medium text-foreground">{m.name}</span>
              {m.dose && <span className="text-muted-foreground"> {m.dose}</span>}
            </span>
            {days !== null && (
              <span className="text-muted-foreground tabular-nums">day {days}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default async function PatientPage({ params }: PatientPageProps) {
  const { patientId } = await params;
  const patient = await getPatient(patientId);
  if (!patient) notFound();

  const [history, summary] = await Promise.all([
    loadHistory(patient.id, 30),
    getPatientRiskSummary(patient.id),
  ]);

  const recent = [...history].reverse();
  const lastTouchpoint = summary.lastTouchpoint ? formatRelative(summary.lastTouchpoint) : "no activity";
  const flaggedFlags = summary.recentRiskFlags;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <Link href="/clinician" className="text-xs text-muted-foreground hover:text-foreground">
        ← Patients
      </Link>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Patient
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{patient.name}</h1>
            <RiskBadge level={summary.level} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {patient.conditions.join(" · ") || "no conditions on file"}
          </p>
        </div>
        <Link
          href={`/coach/${patient.slug ?? patient.id}`}
          className="text-xs font-medium text-primary hover:underline"
        >
          Open coach view →
        </Link>
      </header>

      {summary.level === "high" && (
        <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Risk flag — review recommended.
          </p>
          {flaggedFlags.length > 0 && (
            <p className="mt-1 text-xs text-red-700/80 dark:text-red-400/80">
              {flaggedFlags.join(", ").replace(/_/g, " ")}
            </p>
          )}
        </div>
      )}

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {/* Coach chat */}
        <div className="bg-card text-card-foreground rounded-2xl border p-5 lg:col-span-2">
          <header className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Recent Coach chat</h2>
            <span className="text-[11px] text-muted-foreground">
              last 7d · {summary.totalMessages} msg
            </span>
          </header>

          {recent.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              No chat activity yet. Patient hasn&apos;t started a session.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recent.slice(0, 8).map((m) => {
                const flagged = isFlagged(m.flags);
                const userFlags = (m.flags ?? []).filter((f) => !f.startsWith("risk:"));
                return (
                  <li
                    key={m.id}
                    className={cn(
                      "rounded-xl border p-3 text-xs leading-relaxed",
                      flagged && "border-red-500/40 bg-red-500/5"
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium uppercase tracking-wide text-[10px] text-muted-foreground">
                        {m.role}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelative(m.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{m.content}</p>
                    {userFlags.length > 0 && (
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-red-600 dark:text-red-400">
                        flags: {userFlags.join(", ").replace(/_/g, " ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right column — at-a-glance + Sentinel placeholder */}
        <div className="space-y-4">
          <div className="bg-card text-card-foreground rounded-2xl border p-5">
            <h2 className="text-sm font-medium">At a glance</h2>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
              <dt className="text-muted-foreground">Last touch</dt>
              <dd className="text-right tabular-nums">{lastTouchpoint}</dd>
              <dt className="text-muted-foreground">Risk</dt>
              <dd className="text-right">
                <RiskBadge level={summary.level} />
              </dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="text-right tabular-nums">
                {patient.phone ?? "not on file"}
              </dd>
            </dl>
            <div className="mt-4 border-t pt-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Current meds
              </p>
              <MedSummary patient={patient} />
            </div>
          </div>

          <div className="bg-card text-card-foreground rounded-2xl border p-5">
            <h2 className="text-sm font-medium">Sentinel calls</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Auto-generated SOAP notes ship in Phase 2.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
