import { NextResponse } from "next/server";
import { getPatient } from "@/lib/patients";
import { generatePreVisitBrief } from "@/lib/brief";
import { insforgeServer } from "@/lib/insforge";

export const runtime = "nodejs";
export const maxDuration = 60;

type BriefBody = { patientId: string };

export async function POST(req: Request) {
  let body: BriefBody;
  try {
    body = (await req.json()) as BriefBody;
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

  let result;
  try {
    result = await generatePreVisitBrief({ patient });
  } catch (err) {
    console.error("[brief] generation failed", err);
    return NextResponse.json(
      { ok: false, error: "Brief generation failed", detail: String(err) },
      { status: 502 }
    );
  }

  // Persist as a clinician_note with source='pre_visit_brief' so it's part of the audit trail
  const { error } = await insforgeServer.database.from("clinician_notes").insert([{
    patient_id: patient.id,
    source: "pre_visit_brief",
    soap_note: { subjective: result.text, objective: "", assessment: "", plan: "" },
    risk_level: "low",
    flags: [],
  }]);
  if (error) {
    console.warn("[brief] failed to persist", error);
  }

  return NextResponse.json({
    ok: true,
    text: result.text,
    generated_at: result.generated_at,
  });
}
