import { NextResponse } from "next/server";
import { insforgeServer } from "@/lib/insforge";
import { generateSoapNote, type SoapNote } from "@/lib/soap";

export const runtime = "nodejs";
export const maxDuration = 60;

// Retell sends events like { event: 'call_started' | 'call_ended' | 'call_analyzed', call: {...} }
type RetellEvent = "call_started" | "call_ended" | "call_analyzed" | string;

type RetellCall = {
  call_id: string;
  agent_id?: string;
  call_status?: string;
  direction?: "inbound" | "outbound";
  from_number?: string;
  to_number?: string;
  transcript?: string;
  recording_url?: string;
  duration_ms?: number;
  metadata?: { patient_id?: string } & Record<string, unknown>;
};

type RetellWebhookPayload = {
  event: RetellEvent;
  call: RetellCall;
};

function statusFromCall(call: RetellCall): string {
  switch (call.call_status) {
    case "ongoing":
    case "registered":
    case "not_connected":
      return "in_progress";
    case "ended":
      return "completed";
    case "error":
      return "failed";
    default:
      return "in_progress";
  }
}

async function findPatientForCall(call: RetellCall): Promise<{ id: string; slug: string | null; name: string; conditions: string[]; current_meds: { name: string; dose?: string; started_at?: string }[] } | null> {
  // Prefer explicit patient_id in metadata (set when we trigger via /api/sentinel/trigger)
  const patientId = (call.metadata as { patient_id?: string } | undefined)?.patient_id;
  if (patientId) {
    const { data } = await insforgeServer.database
      .from("patients")
      .select("id, slug, name, conditions, current_meds, phone")
      .eq("id", patientId)
      .limit(1)
      .single();
    if (data) return data as never;
  }

  // Fall back: match by phone (to_number for outbound)
  if (call.to_number) {
    const { data } = await insforgeServer.database
      .from("patients")
      .select("id, slug, name, conditions, current_meds, phone")
      .eq("phone", call.to_number)
      .limit(1)
      .single();
    if (data) return data as never;
  }

  return null;
}

export async function POST(req: Request) {
  let payload: RetellWebhookPayload;
  try {
    payload = (await req.json()) as RetellWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { event, call } = payload;
  if (!call?.call_id) {
    return NextResponse.json({ ok: false, error: "Missing call.call_id" }, { status: 400 });
  }

  console.log(`[retell-webhook] event=${event} call_id=${call.call_id} status=${call.call_status}`);

  const patient = await findPatientForCall(call);
  if (!patient) {
    console.warn(`[retell-webhook] no patient match for call_id=${call.call_id}`);
    // Still 200 so Retell doesn't retry — we just can't link it.
    return NextResponse.json({ ok: true, warn: "no_patient_match" });
  }

  // Upsert the calls row keyed by retell_call_id (idempotent across retries)
  const callRow = {
    patient_id: patient.id,
    retell_call_id: call.call_id,
    status: statusFromCall(call),
    transcript: call.transcript ?? null,
    recording_url: call.recording_url ?? null,
    duration_sec: call.duration_ms ? Math.round(call.duration_ms / 1000) : null,
  };

  const { data: upserted, error: upsertErr } = await insforgeServer
    .database
    .from("calls")
    .upsert([callRow], { onConflict: "retell_call_id" })
    .select("id")
    .single();

  if (upsertErr) {
    console.error("[retell-webhook] upsert calls failed", upsertErr);
    return NextResponse.json({ ok: false, error: "db_upsert_failed" }, { status: 500 });
  }

  const callRowId = (upserted as { id: string } | null)?.id;

  // Generate SOAP note only when transcript is available (typically call_analyzed event)
  if (event === "call_analyzed" && call.transcript && callRowId) {
    try {
      const { soap, risk_level, flags, raw } = await generateSoapNote(call.transcript, patient);
      const soapJson: SoapNote = soap;

      const { error: noteErr } = await insforgeServer.database
        .from("clinician_notes")
        .insert([{
          patient_id: patient.id,
          source: "sentinel_call",
          source_ref: callRowId,
          soap_note: soapJson,
          risk_level,
          flags,
        }]);

      if (noteErr) {
        console.error("[retell-webhook] insert clinician_notes failed", noteErr);
      } else {
        console.log(`[retell-webhook] SOAP generated for call=${call.call_id} risk=${risk_level} flags=[${flags.join(",")}]`);
      }
      // Don't surface raw model output to caller; logged only.
      void raw;
    } catch (err) {
      console.error("[retell-webhook] SOAP generation failed", err);
    }
  }

  return NextResponse.json({ ok: true, event, call_id: call.call_id });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "retell-webhook",
    status: "live",
    note: "POST a Retell event to this endpoint.",
  });
}
