import { NextResponse } from "next/server";
import { insforgeServer } from "@/lib/insforge";
import { getPatient } from "@/lib/patients";

export const runtime = "nodejs";

type ReplyBody = {
  patientId: string;
  sessionId: string;
  text: string;
};

export async function POST(req: Request) {
  let body: ReplyBody;
  try {
    body = (await req.json()) as ReplyBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.patientId || !body.sessionId || !body.text?.trim()) {
    return NextResponse.json(
      { ok: false, error: "patientId, sessionId, and text are required" },
      { status: 400 }
    );
  }

  const patient = await getPatient(body.patientId);
  if (!patient) {
    return NextResponse.json({ ok: false, error: "Patient not found" }, { status: 404 });
  }

  const { data, error } = await insforgeServer
    .database
    .from("chat_messages")
    .insert([{
      patient_id: patient.id,
      session_id: body.sessionId,
      role: "provider",
      content: body.text.trim(),
      private: false, // provider messages are by definition visible to the provider
    }])
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[clinician/reply] insert failed", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const row = data as { id: string; created_at: string } | null;
  return NextResponse.json({
    ok: true,
    message: row,
  });
}
