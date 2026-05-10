"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "klarity-coach-disclaimer-v1";

export default function DemoDisclaimer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* noop */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          Heads up — demo app
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">
          A quick note before you chat.
        </h2>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>
            This is a proof-of-concept hackathon build. It is{" "}
            <strong className="text-foreground">not a real clinical product.</strong>
          </p>
          <p>
            Every message you send is stored in a shared demo database. Because
            there is no authentication, anyone visiting this URL could see what
            you typed. Don&apos;t share information you wouldn&apos;t share publicly.
          </p>
          <p>
            To wipe a conversation, use the{" "}
            <strong className="text-foreground">clear chat</strong> link at the
            bottom of the page, or hit{" "}
            <strong className="text-foreground">Restore demo state</strong> on
            the home page to reset everything to defaults.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          I understand — let me in
        </button>
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Shown once per browser. Clear your local storage to see it again.
        </p>
      </div>
    </div>
  );
}
