"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { cn } from "@/lib/utils";

type Props = {
  patientId: string;
  patientName: string;
  initialMessages: UIMessage[];
};

export default function CoachChat({ patientId, patientName, initialMessages }: Props) {
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/coach",
      body: { patientId },
    }),
    messages: initialMessages,
  });

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || status === "streaming" || status === "submitted") return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="flex flex-1 flex-col">
      <div
        ref={scrollerRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-2xl border bg-card p-5"
      >
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            Hi {patientName.split(" ")[0]}, I&apos;m your coach. What&apos;s on your mind?
          </div>
        )}

        {messages.map((m) => {
          const text = m.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("");
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed",
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {text || (
                  <span className="opacity-50">
                    {status === "streaming" || status === "submitted" ? "…" : ""}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {(status === "submitted" || status === "streaming") &&
          messages.at(-1)?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-2 text-sm text-muted-foreground">
                <span className="inline-block animate-pulse">…</span>
              </div>
            </div>
          )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error.message || "Something went wrong. Try again."}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={status === "streaming" || status === "submitted"}
          className="flex-1 rounded-xl border bg-background px-4 py-2 text-sm outline-none ring-ring focus:ring-2 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || status === "streaming" || status === "submitted"}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          Send
        </button>
      </form>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Not a substitute for medical advice. In crisis, call or text 988.
      </p>
    </div>
  );
}
