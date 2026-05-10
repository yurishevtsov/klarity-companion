"use client";

import { useState, useRef, useEffect, useMemo, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import FocusOverlay, { type FocusState } from "./FocusOverlay";

type Props = {
  patientId: string;
  patientName: string;
  initialMessages: UIMessage[];
};

const FOCUS_TRIGGERS = ["/focus", "i need to lock in", "hyperfocus mode"];
const SESSION_LENGTH_SEC = 25 * 60;

function isFocusTrigger(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return FOCUS_TRIGGERS.some((t) => lower === t || lower.includes(t));
}

export default function CoachChat({ patientId, patientName, initialMessages }: Props) {
  const [input, setInput] = useState("");
  const [clearing, setClearing] = useState(false);
  const [focusState, setFocusState] = useState<FocusState | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Sync focus state into a ref so the transport body fn reads fresh values.
  const focusRef = useRef<FocusState | null>(null);
  focusRef.current = focusState;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/coach",
        body: () => {
          const fs = focusRef.current;
          const focusMode = fs?.phase === "running";
          const focusTask = fs?.phase === "running" ? fs.task : null;
          return { patientId, focus_mode: focusMode, focus_task: focusTask };
        },
      }),
    [patientId]
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
    messages: initialMessages,
  });

  async function clearChat() {
    if (clearing || status === "streaming") return;
    if (messages.length === 0) return;
    if (!window.confirm("Clear this conversation? This deletes the patient's coach history.")) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch("/api/coach/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      if (res.ok) {
        setMessages([]);
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        window.alert(`Failed to clear: ${json.error ?? res.status}`);
      }
    } finally {
      setClearing(false);
    }
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || status === "streaming" || status === "submitted") return;
    if (isFocusTrigger(trimmed)) {
      setFocusState({ phase: "picking" });
      setInput("");
      return;
    }
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <>
    {focusState && (
      <FocusOverlay
        state={focusState}
        onPick={(task) =>
          setFocusState({
            phase: "running",
            task,
            startedAt: Date.now(),
            sessionLength: SESSION_LENGTH_SEC,
          })
        }
        onComplete={() =>
          setFocusState((s) =>
            s?.phase === "running" ? { phase: "break", task: s.task } : s
          )
        }
        onExit={() => setFocusState(null)}
      />
    )}
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

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Not a substitute for medical advice. In crisis, call or text 988.</span>
        <button
          type="button"
          onClick={clearChat}
          disabled={clearing || status === "streaming" || messages.length === 0}
          className="text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          {clearing ? "clearing…" : "clear chat"}
        </button>
      </div>
    </div>
    </>
  );
}
