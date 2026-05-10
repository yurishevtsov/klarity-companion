import type { UIMessage } from "ai";
import { insforgeServer } from "@/lib/insforge";

export type ChatRow = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  flags: string[];
  created_at: string;
};

export async function loadHistory(patientId: string, limit = 50): Promise<ChatRow[]> {
  const { data, error } = await insforgeServer
    .database
    .from("chat_messages")
    .select("id, role, content, flags, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[loadHistory] error", error);
    return [];
  }
  return (data ?? []) as ChatRow[];
}

export function rowsToUIMessages(rows: ChatRow[]): UIMessage[] {
  return rows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant",
      parts: [{ type: "text", text: r.content }],
    }));
}
