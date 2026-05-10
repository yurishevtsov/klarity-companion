"use client";

import { useState } from "react";

type Props = {
  patientId: string;
};

type State =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "ready"; text: string; generatedAt: string }
  | { kind: "error"; message: string };

export default function PreVisitBrief({ patientId }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function generate() {
    setState({ kind: "generating" });
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setState({ kind: "error", message: json.error ?? `HTTP ${res.status}` });
        return;
      }
      setState({ kind: "ready", text: json.text, generatedAt: json.generated_at });
    } catch (err) {
      setState({ kind: "error", message: String(err) });
    }
  }

  if (state.kind === "ready") {
    return (
      <div className="rounded-2xl border bg-card p-5">
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 items-center rounded-full bg-primary px-2 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
              Pre-visit brief
            </span>
            <span className="text-[10px] text-muted-foreground">
              generated {new Date(state.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
          <button
            type="button"
            onClick={generate}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Regenerate
          </button>
        </header>
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{state.text}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed p-5">
      <button
        type="button"
        onClick={generate}
        disabled={state.kind === "generating"}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline disabled:opacity-50"
      >
        {state.kind === "generating" ? (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            Synthesizing 14 days of context…
          </>
        ) : (
          "✨ Generate pre-visit brief"
        )}
      </button>
      <p className="mt-1 text-[11px] text-muted-foreground">
        4-6 sentence summary across coach chat + Sentinel calls. ~3-5s.
      </p>
      {state.kind === "error" && (
        <p className="mt-2 text-[11px] text-red-700 dark:text-red-400">{state.message}</p>
      )}
    </div>
  );
}
