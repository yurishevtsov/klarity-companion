import { generateText } from "ai";
import { coachModel } from "@/lib/ai";
import type { Patient } from "@/lib/patients";

export type RiskLevel = "low" | "medium" | "high";

export type RiskAssessment = {
  risk_level: RiskLevel;
  flags: string[];
};

const KNOWN_FLAGS = new Set([
  "suicidal_ideation",
  "self_harm",
  "severe_side_effect",
  "medication_misuse",
  "diversion",
  "escalation_requested",
  "manic_features",
  "psychotic_features",
]);

export async function classifyRisk(
  userMessage: string,
  assistantMessage: string,
  patient: Pick<Patient, "name" | "conditions" | "current_meds">
): Promise<RiskAssessment> {
  const meds = patient.current_meds.map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ""}`).join(", ") || "none";
  const conditions = patient.conditions.join(", ") || "none";

  const prompt = `Patient: ${patient.name}
Conditions: ${conditions}
Current meds: ${meds}

Latest exchange:
USER: ${userMessage}
ASSISTANT: ${assistantMessage}

Classify the USER's message for clinical risk. Return ONLY a single JSON object, no markdown, no commentary:

{"risk_level": "low" | "medium" | "high", "flags": ["..."]}

Allowed flag values:
- suicidal_ideation
- self_harm
- severe_side_effect
- medication_misuse
- diversion
- escalation_requested
- manic_features
- psychotic_features

Rules:
- Default to {"risk_level": "low", "flags": []} for normal coaching conversation.
- "medium": mild side effects, mood concerns, sleep disruption, or any unclear urgency.
- "high": explicit suicidal ideation, severe side effects (chest pain, hallucinations, syncope), explicit medication misuse, or diversion (selling/sharing controlled meds).
- Never include flags outside the allowed list.
`;

  try {
    const { text } = await generateText({
      model: coachModel,
      system:
        "You are a safety classifier for an ADHD/psych telehealth coach. Output strict JSON only.",
      prompt,
      maxOutputTokens: 200,
      temperature: 0,
    });

    const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    const parsed = JSON.parse(cleaned) as Partial<RiskAssessment>;

    const risk_level: RiskLevel = ["low", "medium", "high"].includes(parsed.risk_level as string)
      ? (parsed.risk_level as RiskLevel)
      : "low";
    const flags = Array.isArray(parsed.flags)
      ? parsed.flags.filter((f) => typeof f === "string" && KNOWN_FLAGS.has(f))
      : [];

    return { risk_level, flags };
  } catch (err) {
    console.error("[classifyRisk] failed, defaulting to low", err);
    return { risk_level: "low", flags: [] };
  }
}
