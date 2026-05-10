import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getPatient } from "@/lib/patients";
import { loadHistory, loadSessions, rowsToUIMessages } from "@/lib/chat";
import { KlarityMark } from "@/components/klarity-mark";
import CoachChat from "./CoachChat";

export const dynamic = "force-dynamic";

type CoachPageProps = {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ session?: string }>;
};

export default async function CoachPage({ params, searchParams }: CoachPageProps) {
  const { patientId } = await params;
  const { session: sessionParam } = await searchParams;
  const patient = await getPatient(patientId);
  if (!patient) notFound();

  const sessions = await loadSessions(patient.id);

  // Determine which session to load:
  // 1. If ?session=<id> is present and exists, use it
  // 2. Else use the latest session (sessions are sorted newest-first)
  // 3. Else generate a fresh uuid (the patient has zero history)
  let activeSessionId: string;
  if (sessionParam && sessions.some((s) => s.id === sessionParam)) {
    activeSessionId = sessionParam;
  } else if (sessions.length > 0) {
    activeSessionId = sessions[0].id;
  } else {
    activeSessionId = randomUUID();
  }

  const history = await loadHistory(patient.id, 200, { sessionId: activeSessionId });
  const initialMessages = rowsToUIMessages(history);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <KlarityMark showWordmark={false} />
        <span>Klarity Companion</span>
      </Link>

      <header className="mt-3 mb-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Coach
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{patient.name}</h1>
      </header>

      <CoachChat
        patientId={patient.id}
        patientSlug={patient.slug ?? patient.id}
        patientName={patient.name}
        sessions={sessions}
        activeSessionId={activeSessionId}
        initialMessages={initialMessages}
      />
    </main>
  );
}
