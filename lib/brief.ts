import { generateText } from "ai";
import { soapModel } from "@/lib/ai";
import { insforgeServer } from "@/lib/insforge";
import type { Patient } from "@/lib/patients";

export type BriefInput = {
  patient: Patient;
};

export type BriefResult = {
  text: string;
  generated_at: string;
};

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function summarizeMeds(patient: Patient): string {
  if (patient.current_meds.length === 0) return "no current meds on file";
  return patient.current_meds
    .map((m) => {
      const days = daysSince(m.started_at);
      const start = days !== null ? ` (day ${days})` : "";
      return `${m.name}${m.dose ? ` ${m.dose}` : ""}${start}`;
    })
    .join(", ");
}

export async function generatePreVisitBrief({ patient }: BriefInput): Promise<BriefResult> {
  const since = new Date(Date.now() - FOURTEEN_DAYS_MS).toISOString();

  const [chatRes, callRes, noteRes] = await Promise.all([
    insforgeServer.database
      .from("chat_messages")
      .select("role, content, flags, created_at")
      .eq("patient_id", patient.id)
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    insforgeServer.database
      .from("calls")
      .select("id, status, transcript, duration_sec, created_at")
      .eq("patient_id", patient.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    insforgeServer.database
      .from("clinician_notes")
      .select("source, soap_note, risk_level, flags, created_at")
      .eq("patient_id", patient.id)
      .eq("source", "sentinel_call")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
  ]);

  const chats = (chatRes.data ?? []) as Array<{ role: string; content: string; flags: string[]; created_at: string }>;
  const calls = (callRes.data ?? []) as Array<{ id: string; status: string; transcript: string | null; duration_sec: number | null; created_at: string }>;
  const notes = (noteRes.data ?? []) as Array<{ source: string; soap_note: { subjective: string; objective: string; assessment: string; plan: string }; risk_level: string; flags: string[]; created_at: string }>;

  const chatLines = chats
    .slice(-30)
    .map((m) => {
      const flagTag = (m.flags ?? []).filter((f) => !f.startsWith("risk:")).join(",");
      const tag = flagTag ? ` [${flagTag}]` : "";
      const role = m.role === "user" ? "Patient" : "Coach";
      return `${role}${tag}: ${m.content}`;
    })
    .join("\n");

  const callBlocks = calls.map((c) => {
    const matchingNote = notes.find((n) => Math.abs(new Date(n.created_at).getTime() - new Date(c.created_at).getTime()) < 60_000);
    const sopaSummary = matchingNote
      ? `SOAP — S: ${matchingNote.soap_note.subjective} | O: ${matchingNote.soap_note.objective} | A: ${matchingNote.soap_note.assessment} | P: ${matchingNote.soap_note.plan} | risk: ${matchingNote.risk_level}${matchingNote.flags.length ? ` | flags: ${matchingNote.flags.join(",")}` : ""}`
      : "(no SOAP yet)";
    const transcript = c.transcript ? `Transcript excerpt: ${c.transcript.slice(0, 1500)}` : "(no transcript)";
    return `Sentinel call ${new Date(c.created_at).toISOString().slice(0, 10)} — status=${c.status}${c.duration_sec ? ` duration=${c.duration_sec}s` : ""}\n${sopaSummary}\n${transcript}`;
  }).join("\n\n");

  const meds = summarizeMeds(patient);
  const conditions = patient.conditions.join(", ") || "none";

  const system = `You are a clinical scribe writing a pre-visit brief for a psychiatric/ADHD telehealth provider. The brief is read in 5 seconds before the provider walks into the visit. Be specific, factual, and actionable. Never invent details not present in the source data. No hedging language unless the data warrants it. Output plain prose, 4-6 sentences max, no markdown.`;

  const prompt = `Patient: ${patient.name}
Conditions: ${conditions}
Current meds: ${meds}

--- Coach chat (last 14 days, ${chats.length} messages) ---
${chatLines || "(no coach activity)"}

--- Sentinel calls (last 14 days, ${calls.length} calls) ---
${callBlocks || "(no calls)"}

Write a 4-6 sentence pre-visit brief covering:
1. Where the patient is on their meds (day count, adherence signals).
2. What the most recent Sentinel call surfaced (side effects, mood, PHQ-2, diversion concerns).
3. Patterns in the coach chats this period (recurring complaints, time-of-day issues, behavioral signals).
4. Risk flags if any.
5. One concrete suggestion for the visit ("Suggest: discuss X").

Tone: terse, clinical, useful. Like a senior nurse handing the chart to the provider in the hallway.`;

  const { text } = await generateText({
    model: soapModel,
    system,
    prompt,
    maxOutputTokens: 600,
    temperature: 0.3,
  });

  return {
    text: text.trim(),
    generated_at: new Date().toISOString(),
  };
}
