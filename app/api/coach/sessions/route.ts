import { NextResponse } from "next/server";
import { getPatient } from "@/lib/patients";
import { loadSessions } from "@/lib/chat";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ ok: false, error: "Missing patientId" }, { status: 400 });
  }

  const patient = await getPatient(patientId);
  if (!patient) {
    return NextResponse.json({ ok: false, error: "Patient not found" }, { status: 404 });
  }

  const sessions = await loadSessions(patient.id);
  return NextResponse.json({ ok: true, sessions });
}
