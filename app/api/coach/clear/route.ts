import { NextResponse } from "next/server";
import { insforgeServer } from "@/lib/insforge";
import { getPatient } from "@/lib/patients";

export const runtime = "nodejs";

type ClearBody = { patientId: string };

export async function POST(req: Request) {
  let body: ClearBody;
  try {
    body = (await req.json()) as ClearBody;
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

  const { error } = await insforgeServer
    .database
    .from("chat_messages")
    .delete()
    .eq("patient_id", patient.id);

  if (error) {
    console.error("[coach/clear] delete failed", error);
    return NextResponse.json({ ok: false, error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, patient_id: patient.id });
}
