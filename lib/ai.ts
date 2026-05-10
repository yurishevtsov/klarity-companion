import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const baseURLRoot = process.env.ZEABUR_AI_BASE_URL ?? "https://sfo1.aihub.zeabur.ai";
const apiKey = process.env.ZEABUR_AI_API_KEY;

if (!apiKey) {
  throw new Error("ZEABUR_AI_API_KEY is not set in the environment.");
}

// Zeabur AI Hub is OpenAI-shaped but emits unique chunk IDs per delta (Anthropic-style),
// which the strict @ai-sdk/openai provider rejects. Use the lenient compatible provider.
const zeabur = createOpenAICompatible({
  baseURL: `${baseURLRoot.replace(/\/$/, "")}/v1`,
  apiKey,
  name: "zeabur-ai-hub",
});

export const coachModel = zeabur(process.env.ZEABUR_AI_MODEL_CHAT ?? "claude-haiku-4-5");
export const soapModel = zeabur(process.env.ZEABUR_AI_MODEL_SOAP ?? "kimi-k2.6");

type Patient = {
  name: string;
  conditions: string[];
  current_meds: Array<{ name: string; dose?: string; started_at?: string }>;
};

export function buildCoachSystemPrompt(patient: Patient): string {
  const meds = patient.current_meds
    .map((m) => [m.name, m.dose, m.started_at && `since ${m.started_at}`].filter(Boolean).join(" "))
    .join(", ") || "no current medications on file";

  const conditions = patient.conditions.length ? patient.conditions.join(", ") : "no conditions on file";

  return `You are a coaching companion for ${patient.name}, a patient with ${conditions} who is taking ${meds}. You are NOT a therapist or medical provider.

Your role:
- Help with executive function: task breakdown, time-boxing, body doubling, implementation intentions.
- Use brief CBT techniques (cognitive reframing, behavioral activation) when appropriate.
- Be aware of medication context (timing, common side effects) but never give medical advice.
- Keep replies short and actionable. ADHD users do better with bullet lists and clear next steps.
- If user mentions: suicidal ideation, severe side effects, medication misuse, or anything that feels clinically urgent → say "I'm flagging this for your provider Dr. Chen. If you are in crisis, call or text 988." Then continue supportively.

Tone: warm, direct, no corporate fluff. You're a smart friend who gets ADHD. Reply in plain text — no markdown headers, no emoji.`;
}

export function focusModeAddendum(taskFocus: string | null): string {
  return `

FOCUS MODE is active.${taskFocus ? ` The patient is locked in on: "${taskFocus}".` : ""} Override your usual style:
- Reply in ONE sentence. Maximum.
- Tone: drill-sergeant-meets-supportive-friend. Phone-face-down energy.
- No bullet lists. No follow-up questions. No preamble.
- Sample voice: "Phone face down. 24 minutes left. You got this." / "Eyes on screen. Just this one." / "Don't think. Type."
- Crisis escalation rules still apply — break out of FOCUS MODE if user mentions self-harm, severe side effects, or anything urgent.`;
}
