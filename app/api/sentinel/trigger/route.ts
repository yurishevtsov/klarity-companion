import { NextResponse } from "next/server";
import Retell from "retell-sdk";
import { getPatient } from "@/lib/patients";
import { insforgeServer } from "@/lib/insforge";

export const runtime = "nodejs";

type TriggerBody = {
  patientId: string;
  // 'auto' picks phone if RETELL_FROM_NUMBER is set, else web. Override to force one mode.
  mode?: "auto" | "phone" | "web";
};

type TriggerResponse =
  | { ok: true; mode: "phone"; call_id: string }
  | { ok: true; mode: "web"; call_id: string; access_token: string }
  | { ok: false; error: string };

export async function POST(req: Request) {
  const apiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID;
  const fromNumber = process.env.RETELL_FROM_NUMBER;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Sentinel not configured: set RETELL_API_KEY and RETELL_AGENT_ID on the server.",
      } as TriggerResponse,
      { status: 503 }
    );
  }

  let body: TriggerBody;
  try {
    body = (await req.json()) as TriggerBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" } as TriggerResponse,
      { status: 400 }
    );
  }
  if (!body.patientId) {
    return NextResponse.json(
      { ok: false, error: "Missing patientId" } as TriggerResponse,
      { status: 400 }
    );
  }

  const patient = await getPatient(body.patientId);
  if (!patient) {
    return NextResponse.json(
      { ok: false, error: "Patient not found" } as TriggerResponse,
      { status: 404 }
    );
  }

  const requested = body.mode ?? "auto";
  const mode: "phone" | "web" =
    requested === "phone"
      ? "phone"
      : requested === "web"
        ? "web"
        : fromNumber
          ? "phone"
          : "web";

  if (mode === "phone" && (!fromNumber || !patient.phone)) {
    return NextResponse.json(
      {
        ok: false,
        error: !fromNumber
          ? "Phone mode unavailable: RETELL_FROM_NUMBER not set."
          : `Patient ${patient.name} has no phone on file.`,
      } as TriggerResponse,
      { status: 400 }
    );
  }

  const retell = new Retell({ apiKey });
  const metadata = { patient_id: patient.id, slug: patient.slug ?? "" };

  try {
    if (mode === "phone") {
      const call = await retell.call.createPhoneCall({
        from_number: fromNumber!,
        to_number: patient.phone!,
        override_agent_id: agentId,
        metadata,
      });

      await preCreateCall(patient.id, call.call_id);

      return NextResponse.json({
        ok: true,
        mode: "phone",
        call_id: call.call_id,
      } as TriggerResponse);
    }

    // web mode
    const call = await retell.call.createWebCall({
      agent_id: agentId,
      metadata,
    });

    await preCreateCall(patient.id, call.call_id);

    return NextResponse.json({
      ok: true,
      mode: "web",
      call_id: call.call_id,
      access_token: call.access_token,
    } as TriggerResponse);
  } catch (err) {
    console.error("[sentinel/trigger] retell error", err);
    return NextResponse.json(
      { ok: false, error: "Retell API call failed", detail: String(err) } as TriggerResponse,
      { status: 502 }
    );
  }
}

async function preCreateCall(patientId: string, retellCallId: string) {
  const { error } = await insforgeServer.database.from("calls").insert([{
    patient_id: patientId,
    retell_call_id: retellCallId,
    status: "in_progress",
    scheduled_for: new Date().toISOString(),
  }]);
  if (error) {
    console.warn("[sentinel/trigger] failed to pre-create calls row", error);
  }
}
