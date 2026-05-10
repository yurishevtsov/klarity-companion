import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { coachModel, buildCoachSystemPrompt } from "@/lib/ai";
import { getPatient } from "@/lib/patients";
import { insforgeServer } from "@/lib/insforge";

export const runtime = "nodejs";

type CoachRequestBody = {
  messages: UIMessage[];
  patientId: string;
};

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(req: Request) {
  const body = (await req.json()) as CoachRequestBody;
  const { messages, patientId } = body;

  if (!patientId || !Array.isArray(messages)) {
    return new Response("Bad request", { status: 400 });
  }

  const patient = await getPatient(patientId);
  if (!patient) {
    return new Response(`Patient not found: ${patientId}`, { status: 404 });
  }

  // Persist the latest user message *before* calling the LLM,
  // so it lands in the dashboard even if the model fails midway.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    const text = extractText(lastUser);
    if (text) {
      const { error } = await insforgeServer.database
        .from("chat_messages")
        .insert([{ patient_id: patient.id, role: "user", content: text }]);
      if (error) console.error("[coach] failed to persist user message", error);
    }
  }

  const result = streamText({
    model: coachModel,
    system: buildCoachSystemPrompt(patient),
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 400,
    onFinish: async ({ text }) => {
      if (!text) return;
      const { error } = await insforgeServer.database
        .from("chat_messages")
        .insert([{ patient_id: patient.id, role: "assistant", content: text }]);
      if (error) console.error("[coach] failed to persist assistant message", error);
    },
  });

  return result.toUIMessageStreamResponse();
}
