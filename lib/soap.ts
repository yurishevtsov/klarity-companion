import { generateText } from "ai";
import { soapModel } from "@/lib/ai";
import type { Patient } from "@/lib/patients";
import type { RiskLevel } from "@/lib/chat";

export type SoapNote = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export type SoapResult = {
  soap: SoapNote;
  risk_level: RiskLevel;
  flags: string[];
  raw: string;
};

const KNOWN_FLAGS = new Set([
  "phq2_positive",
  "side_effect_mild",
  "side_effect_severe",
  "sleep_disruption",
  "appetite_change",
  "diversion_concern",
  "medication_misuse",
  "suicidal_ideation",
  "escalation_requested",
]);

export async function generateSoapNote(
  transcript: string,
  patient: Pick<Patient, "name" | "conditions" | "current_meds">
): Promise<SoapResult> {
  const meds = patient.current_meds.map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ""}`).join(", ") || "none";
  const conditions = patient.conditions.join(", ") || "none";

  const system = `You are a clinical scribe for a psychiatric/ADHD telehealth practice. You write structured SOAP notes from check-in call transcripts. You are NOT a medical provider — you summarize what the patient said and flag concerns for the clinician to review. Output strict JSON only.`;

  const prompt = `Patient: ${patient.name}
Conditions: ${conditions}
Current meds: ${meds}

Sentinel post-prescription check-in call transcript:
"""
${transcript}
"""

Generate a structured SOAP note. Return ONLY a single JSON object, no markdown, no commentary:

{
  "subjective": "2-3 sentences. What the patient reports — symptoms, side effects, mood. Use the patient's own framing.",
  "objective": "1-2 sentences. Observable facts from the call (PHQ-2 responses, days on med, frequency of complaints). Don't invent numbers; only what the transcript supports.",
  "assessment": "1-2 sentences. Clinical impression of trajectory: improving / stable / concerning / urgent. Note adherence and any red flags.",
  "plan": "1-2 sentences. Recommended next steps: continue current dose, consider dose adjustment, schedule follow-up, urgent provider review, etc.",
  "risk_level": "low" | "medium" | "high",
  "flags": ["..."]
}

Allowed flag values: phq2_positive, side_effect_mild, side_effect_severe, sleep_disruption, appetite_change, diversion_concern, medication_misuse, suicidal_ideation, escalation_requested.

Rules:
- "high" if suicidal ideation, severe physical side effects (chest pain, hallucinations, syncope), explicit medication misuse, or diversion.
- "medium" if PHQ-2 positive items, mild-moderate side effects, sleep disruption, or appetite changes worth noting.
- "low" for stable check-ins with no concerning content.
- Never include flags outside the allowed list.
- Never invent details not present in the transcript. If transcript is too short or unclear, say so in subjective and use risk_level "low" with empty flags.
`;

  const { text } = await generateText({
    model: soapModel,
    system,
    prompt,
    maxOutputTokens: 1500,
    temperature: 0.2,
  });

  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");

  try {
    const parsed = JSON.parse(cleaned) as Partial<SoapResult & SoapNote>;

    const soap: SoapNote = {
      subjective: typeof parsed.subjective === "string" ? parsed.subjective : "",
      objective: typeof parsed.objective === "string" ? parsed.objective : "",
      assessment: typeof parsed.assessment === "string" ? parsed.assessment : "",
      plan: typeof parsed.plan === "string" ? parsed.plan : "",
    };

    const risk_level: RiskLevel = ["low", "medium", "high"].includes(parsed.risk_level as string)
      ? (parsed.risk_level as RiskLevel)
      : "low";

    const flags = Array.isArray(parsed.flags)
      ? parsed.flags.filter((f) => typeof f === "string" && KNOWN_FLAGS.has(f))
      : [];

    return { soap, risk_level, flags, raw: text };
  } catch (err) {
    console.error("[generateSoapNote] parse failed", err);
    return {
      soap: {
        subjective: "Unable to parse SOAP from transcript. See raw output.",
        objective: "",
        assessment: "Manual review required.",
        plan: "Provider should review transcript directly.",
      },
      risk_level: "low",
      flags: [],
      raw: text,
    };
  }
}
