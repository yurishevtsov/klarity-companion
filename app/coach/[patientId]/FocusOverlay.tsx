"use client";

import { useEffect, useState, type FormEvent } from "react";

export type FocusState =
  | { phase: "picking" }
  | { phase: "running"; task: string; startedAt: number; sessionLength: number }
  | { phase: "break"; task: string };

type Props = {
  state: FocusState;
  onPick: (task: string) => void;
  onComplete: () => void;
  onExit: () => void;
};

const SESSION_LENGTH_SEC = 25 * 60;

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FocusOverlay({ state, onPick, onComplete, onExit }: Props) {
  const [task, setTask] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // Tick every second when running
  useEffect(() => {
    if (state.phase !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "running") return;
    const elapsed = Math.floor((now - state.startedAt) / 1000);
    if (elapsed >= state.sessionLength) {
      onComplete();
    }
  }, [now, state, onComplete]);

  function submitTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = task.trim();
    if (!trimmed) return;
    onPick(trimmed);
    setTask("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm">
      <button
        type="button"
        onClick={onExit}
        className="absolute right-4 top-4 text-[11px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
      >
        exit focus
      </button>

      {state.phase === "picking" && (
        <form
          onSubmit={submitTask}
          className="mx-6 w-full max-w-md text-center"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Focus mode
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100">
            Pick one thing.
          </h2>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-100">
            Just one.
          </p>
          <input
            autoFocus
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="What's the one thing?"
            className="mt-8 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-center text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!task.trim()}
            className="mt-4 w-full rounded-2xl bg-zinc-100 py-3 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-40"
          >
            Lock in
          </button>
        </form>
      )}

      {state.phase === "running" && (
        <RunningPanel state={state} now={now} />
      )}

      {state.phase === "break" && (
        <div className="mx-6 w-full max-w-md text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Break
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100">
            Stand up. Water.
          </h2>
          <p className="mt-2 text-zinc-400">
            5 minutes. You earned it.
          </p>
          <button
            type="button"
            onClick={onExit}
            className="mt-8 rounded-2xl bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-white"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function RunningPanel({
  state,
  now,
}: {
  state: Extract<FocusState, { phase: "running" }>;
  now: number;
}) {
  const elapsed = Math.floor((now - state.startedAt) / 1000);
  const remaining = Math.max(0, state.sessionLength - elapsed);
  const progress = Math.min(1, elapsed / state.sessionLength);

  return (
    <div className="mx-6 w-full max-w-md text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Focused on
      </p>
      <h2 className="mt-3 text-2xl font-medium text-zinc-100 line-clamp-2">
        {state.task}
      </h2>

      <div className="relative mx-auto mt-12 h-48 w-48">
        {/* Animated ring */}
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50" cy="50" r="46"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="3" fill="none"
          />
          <circle
            cx="50" cy="50" r="46"
            stroke="#4599FF"
            strokeWidth="3" fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 46}`}
            strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress)}`}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-mono text-4xl tabular-nums text-zinc-100">
            {formatTime(remaining)}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
            remaining
          </p>
        </div>
      </div>

      <p className="mt-10 text-sm text-zinc-400">
        Phone face down. Tabs closed. Just this.
      </p>
    </div>
  );
}
