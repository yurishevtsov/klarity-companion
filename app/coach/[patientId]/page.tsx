import Link from "next/link";
import { notFound } from "next/navigation";
import { getPatient } from "@/lib/patients";
import { loadHistory, rowsToUIMessages } from "@/lib/chat";
import { KlarityMark } from "@/components/klarity-mark";
import CoachChat from "./CoachChat";

type CoachPageProps = {
  params: Promise<{ patientId: string }>;
};

export default async function CoachPage({ params }: CoachPageProps) {
  const { patientId } = await params;
  const patient = await getPatient(patientId);
  if (!patient) notFound();

  const history = await loadHistory(patient.id);
  const initialMessages = rowsToUIMessages(history);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-8">
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
        patientName={patient.name}
        initialMessages={initialMessages}
      />
    </main>
  );
}
