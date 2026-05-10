import { NextResponse } from "next/server";
import Retell from "retell-sdk";
import { getPatient } from "@/lib/patients";
import { insforgeServer } from "@/lib/insforge";

export const runtime = "nodejs";

type TriggerBody = {
  patientId: string;
};

export async function POST(req: Request) {
  const apiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID;
  const fromNumber = process.env.RETELL_FROM_NUMBER;

  if (!apiKey || !agentId || !fromNumber) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Sentinel not configured: set RETELL_API_KEY, RETELL_AGENT_ID, and RETELL_FROM_NUMBER on the server.",
      },
      { status: 503 }
    );
  }

  let body: TriggerBody;
  try {
    body = (await req.json()) as TriggerBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.patientId) {
    return NextResponse.json({ ok: false, error: "Missing patientId" }, { status: 400 });
  }

  const patient = await getPatient(body.patientId);
  if (!patient) {
    return NextResponse.json({ ok: false, error: "Patient not found" }, { status: 404 });
  }
  if (!patient.phone) {
    return NextResponse.json(
      { ok: false, error: `Patient ${patient.name} has no phone on file.` },
      { status: 400 }
    );
  }

  // Retell's outbound phone call: agent is bound to from_number in the Retell dashboard.
  // Pass override_agent_id only when you want to dispatch a different agent for this call.
  const retell = new Retell({ apiKey });
  let call;
  try {
    call = await retell.call.createPhoneCall({
      from_number: fromNumber,
      to_number: patient.phone,
      override_agent_id: agentId,
      metadata: { patient_id: patient.id, slug: patient.slug },
    });
  } catch (err) {
    console.error("[sentinel/trigger] retell error", err);
    return NextResponse.json(
      { ok: false, error: "Retell API call failed", detail: String(err) },
      { status: 502 }
    );
  }

  // Pre-create the calls row so the dashboard can show it as 'in_progress' immediately.
  // The webhook will upsert this row with transcript + recording when the call ends.
  const { error: insertErr } = await insforgeServer.database.from("calls").insert([{
    patient_id: patient.id,
    retell_call_id: call.call_id,
    status: "in_progress",
    scheduled_for: new Date().toISOString(),
  }]);

  if (insertErr) {
    console.warn("[sentinel/trigger] failed to pre-create calls row", insertErr);
    // Not fatal — webhook will create on call_ended.
  }

  return NextResponse.json({
    ok: true,
    call_id: call.call_id,
    patient: { id: patient.id, name: patient.name, phone: patient.phone },
  });
}
