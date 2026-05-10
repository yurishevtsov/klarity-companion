"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  callId: string;
};

export default function CallDeleteButton({ callId }: Props) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function remove() {
    if (busy) return;
    if (!window.confirm("Delete this Sentinel call and its SOAP note?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sentinel/call/${callId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        window.alert(`Delete failed: ${json.error ?? res.status}`);
      }
    } catch (err) {
      window.alert(`Delete failed: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      title="Delete this call"
      className="inline-flex h-5 w-5 items-center justify-center rounded text-[14px] leading-none text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-700 disabled:opacity-40"
    >
      {busy ? "…" : "×"}
    </button>
  );
}
