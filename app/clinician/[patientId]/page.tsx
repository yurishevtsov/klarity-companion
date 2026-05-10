import Link from "next/link";
import { notFound } from "next/navigation";
import { getPatient, type Patient } from "@/lib/patients";
import { loadHistory, loadSessions, getPatientRiskSummary } from "@/lib/chat";
import { loadCallsWithNotes, type CallWithNote } from "@/lib/sentinel";
import { RiskBadge } from "@/components/risk-badge";
import { KlarityMark } from "@/components/klarity-mark";
import { Prose } from "@/components/prose";
import { cn } from "@/lib/utils";
import SentinelTrigger from "./SentinelTrigger";
import PreVisitBrief from "./PreVisitBrief";
import CallDeleteButton from "./CallDeleteButton";
import ChatSessionTiles from "./ChatSessionTiles";

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

function CallCard({ call }: { call: CallWithNote }) {
  const statusStyle = {
    scheduled: "bg-muted text-muted-foreground",
    in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    failed: "bg-red-500/15 text-red-700 dark:text-red-400",
  }[call.status];

  return (
    <li className="group min-w-0 overflow-hidden rounded-xl border p-3 text-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase", statusStyle)}>
          {call.status.replace("_", " ")}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">
            {formatRelative(call.created_at)}
          </span>
          <CallDeleteButton callId={call.id} />
        </div>
      </div>

      {call.duration_sec !== null && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {Math.floor(call.duration_sec / 60)}:{String(call.duration_sec % 60).padStart(2, "0")} duration
        </p>
      )}

      {call.note ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">SOAP</span>
            <RiskBadge level={call.note.risk_level} />
          </div>
          <SoapField label="S" text={call.note.soap_note.subjective} />
          <SoapField label="O" text={call.note.soap_note.objective} />
          <SoapField label="A" text={call.note.soap_note.assessment} />
          <SoapField label="P" text={call.note.soap_note.plan} />
          {call.note.flags.length > 0 && (
            <p className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400">
              flags: {call.note.flags.join(", ").replace(/_/g, " ")}
            </p>
          )}
        </div>
      ) : call.status === "completed" ? (
        <p className="mt-2 text-[11px] text-muted-foreground italic">
          SOAP note generating…
        </p>
      ) : null}
    </li>
  );
}

function SoapField({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div className="flex gap-1.5 text-[11px] leading-relaxed">
      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-bold tabular-nums">
        {label}
      </span>
      <Prose className="min-w-0 flex-1">{text}</Prose>
    </div>
  );
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

  const [history, sessions, summary, calls] = await Promise.all([
    loadHistory(patient.id, 200, { excludePrivate: true }),
    loadSessions(patient.id),
    getPatientRiskSummary(patient.id),
    loadCallsWithNotes(patient.id, 5),
  ]);

  const lastTouchpoint = summary.lastTouchpoint ? formatRelative(summary.lastTouchpoint) : "no activity";
  const flaggedFlags = summary.recentRiskFlags;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Link href="/" className="inline-flex items-center transition-colors hover:text-foreground">
          <KlarityMark showWordmark={false} />
        </Link>
        <span aria-hidden className="text-border">/</span>
        <Link href="/clinician" className="transition-colors hover:text-foreground">
          Patients
        </Link>
      </div>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Patient
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">{patient.name}</h1>
            <RiskBadge level={summary.level} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {patient.conditions.join(" · ") || "no conditions on file"}
          </p>
        </div>
        <Link
          href={`/coach/${patient.slug ?? patient.id}`}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
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

      <div className="mt-6">
        <PreVisitBrief patientId={patient.id} />
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Coach chat */}
        <div className="bg-card text-card-foreground min-w-0 overflow-hidden rounded-2xl border p-5 shadow-sm lg:col-span-2">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">Coach sessions</h2>
            <span className="text-[11px] text-muted-foreground">
              {sessions.length} session{sessions.length === 1 ? "" : "s"} · {summary.totalMessages} msg/wk
            </span>
          </header>

          <ChatSessionTiles
            patientId={patient.id}
            sessions={sessions}
            messages={history}
          />
        </div>

        {/* Right column — at-a-glance + Sentinel placeholder */}
        <div className="space-y-4">
          <div className="bg-card text-card-foreground min-w-0 overflow-hidden rounded-2xl border p-5 shadow-sm">
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

          <div className="bg-card text-card-foreground min-w-0 overflow-hidden rounded-2xl border p-5 shadow-sm">
            <header className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-medium">Sentinel calls</h2>
              <span className="text-[11px] text-muted-foreground">{calls.length}</span>
            </header>
            <SentinelTrigger
              patientId={patient.id}
              patientHasPhone={Boolean(patient.phone)}
            />
            {calls.length === 0 ? (
              <p className="mt-3 text-[11px] text-muted-foreground">
                No check-in calls yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {calls.map((c) => (
                  <CallCard key={c.id} call={c} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
