import { insforgeServer } from "@/lib/insforge";
import type { RiskLevel } from "@/lib/chat";

export type CallRow = {
  id: string;
  retell_call_id: string | null;
  status: "scheduled" | "in_progress" | "completed" | "failed";
  scheduled_for: string | null;
  transcript: string | null;
  recording_url: string | null;
  duration_sec: number | null;
  created_at: string;
};

export type SoapNote = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export type ClinicianNoteRow = {
  id: string;
  source: "sentinel_call" | "coach_summary" | "pre_visit_brief";
  source_ref: string | null;
  soap_note: SoapNote;
  risk_level: RiskLevel;
  flags: string[];
  created_at: string;
};

export type CallWithNote = CallRow & { note: ClinicianNoteRow | null };

export async function loadCallsWithNotes(patientId: string, limit = 10): Promise<CallWithNote[]> {
  const { data: calls, error: callErr } = await insforgeServer
    .database
    .from("calls")
    .select("id, retell_call_id, status, scheduled_for, transcript, recording_url, duration_sec, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (callErr) {
    console.error("[loadCallsWithNotes] calls error", callErr);
    return [];
  }
  const callRows = (calls ?? []) as CallRow[];
  if (callRows.length === 0) return [];

  const callIds = callRows.map((c) => c.id);
  const { data: notes, error: noteErr } = await insforgeServer
    .database
    .from("clinician_notes")
    .select("id, source, source_ref, soap_note, risk_level, flags, created_at")
    .eq("patient_id", patientId)
    .eq("source", "sentinel_call")
    .in("source_ref", callIds);

  if (noteErr) {
    console.error("[loadCallsWithNotes] notes error", noteErr);
  }

  const notesByCall = new Map<string, ClinicianNoteRow>();
  for (const n of (notes ?? []) as ClinicianNoteRow[]) {
    if (n.source_ref) notesByCall.set(n.source_ref, n);
  }

  return callRows.map((c) => ({ ...c, note: notesByCall.get(c.id) ?? null }));
}
