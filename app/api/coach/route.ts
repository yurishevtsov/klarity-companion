import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { coachModel, buildCoachSystemPrompt, focusModeAddendum } from "@/lib/ai";
import { getPatient } from "@/lib/patients";
import { insforgeServer } from "@/lib/insforge";
import { classifyRisk } from "@/lib/risk-classifier";

export const runtime = "nodejs";

type CoachRequestBody = {
  messages: UIMessage[];
  patientId: string;
  focus_mode?: boolean;
  focus_task?: string | null;
};

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(req: Request) {
  const body = (await req.json()) as CoachRequestBody;
  const { messages, patientId, focus_mode, focus_task } = body;

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
  const userMessageText = lastUser ? extractText(lastUser) : "";
  let userMessageId: string | null = null;

  if (userMessageText) {
    const { data, error } = await insforgeServer.database
      .from("chat_messages")
      .insert([{ patient_id: patient.id, role: "user", content: userMessageText }])
      .select("id")
      .single();
    if (error) console.error("[coach] failed to persist user message", error);
    userMessageId = (data as { id: string } | null)?.id ?? null;
  }

  const systemPrompt = focus_mode
    ? buildCoachSystemPrompt(patient) + focusModeAddendum(focus_task ?? null)
    : buildCoachSystemPrompt(patient);

  const result = streamText({
    model: coachModel,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: focus_mode ? 80 : 400,
    onFinish: async ({ text }) => {
      if (!text) return;

      // Persist assistant message
      const { data: assistantRow, error: insertErr } = await insforgeServer.database
        .from("chat_messages")
        .insert([{ patient_id: patient.id, role: "assistant", content: text }])
        .select("id")
        .single();
      if (insertErr) {
        console.error("[coach] failed to persist assistant message", insertErr);
        return;
      }
      const assistantMessageId = (assistantRow as { id: string } | null)?.id ?? null;

      // Risk classification — runs after the stream, ~500ms extra; user already saw the reply.
      const assessment = await classifyRisk(userMessageText, text, patient);
      const shouldFlag = assessment.risk_level !== "low" || assessment.flags.length > 0;
      if (!shouldFlag) return;

      const flagSet = [...assessment.flags, `risk:${assessment.risk_level}`];
      const ids = [userMessageId, assistantMessageId].filter(Boolean) as string[];
      if (ids.length === 0) return;

      const { error: updateErr } = await insforgeServer.database
        .from("chat_messages")
        .update({ flags: flagSet })
        .in("id", ids);
      if (updateErr) console.error("[coach] failed to set flags", updateErr);
    },
  });

  return result.toUIMessageStreamResponse();
}
