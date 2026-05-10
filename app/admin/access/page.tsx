import Link from "next/link";
import { insforgeServer } from "@/lib/insforge";
import { KlarityMark } from "@/components/klarity-mark";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Access log — Klarity Companion",
};

type AccessRow = {
  id: string;
  path: string;
  ip: string | null;
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
};

function formatRelative(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86_400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86_400)}d ago`;
}

function shortenUA(ua: string | null): string {
  if (!ua) return "—";
  // Pull just the browser/device hint out of the UA
  if (ua.includes("Chrome/") && !ua.includes("Edg/") && !ua.includes("OPR/")) return "Chrome";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  if (ua.includes("bot") || ua.includes("Bot")) return "bot";
  return ua.slice(0, 30) + (ua.length > 30 ? "…" : "");
}

export default async function AccessLogPage() {
  const { data, error } = await insforgeServer
    .database
    .from("access_log")
    .select("id, path, ip, user_agent, referrer, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = ((data as AccessRow[]) ?? []);

  // Aggregates: total visits, unique IPs (over what's loaded), top paths.
  const uniqueIps = new Set(rows.map((r) => r.ip).filter(Boolean)).size;
  const pathCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.path] = (acc[r.path] ?? 0) + 1;
    return acc;
  }, {});
  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 overflow-x-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Link href="/" className="inline-flex items-center transition-colors hover:text-foreground">
          <KlarityMark showWordmark={false} />
        </Link>
        <span aria-hidden className="text-border">/</span>
        <span>admin · access log</span>
      </div>

      <header className="mt-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Access log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last 200 page visits, newest first. Used to verify whether shared
          links reached their recipients. No auth on this page — anyone with
          the URL can see it (it&apos;s a hackathon demo).
        </p>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Visits loaded" value={String(rows.length)} />
        <Stat label="Unique IPs" value={String(uniqueIps)} />
        <Stat
          label="Top path"
          value={topPaths[0] ? `${topPaths[0][0]} (${topPaths[0][1]})` : "—"}
          mono
        />
      </section>

      {error && (
        <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load: {error.message}
        </p>
      )}

      {rows.length === 0 && !error && (
        <p className="mt-8 text-sm text-muted-foreground">
          No visits logged yet. Open another page in this app and refresh.
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Path</th>
                <th className="px-3 py-2 text-left">IP</th>
                <th className="px-3 py-2 text-left">UA</th>
                <th className="hidden px-3 py-2 text-left md:table-cell">Referrer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={cn(
                    "border-t",
                    i % 2 === 0 ? "bg-background" : "bg-muted/10"
                  )}
                >
                  <td className="px-3 py-2 text-muted-foreground tabular-nums whitespace-nowrap">
                    {formatRelative(r.created_at)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] [overflow-wrap:anywhere]">
                    {r.path}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] tabular-nums">
                    {r.ip ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {shortenUA(r.user_agent)}
                  </td>
                  <td className="hidden px-3 py-2 text-muted-foreground [overflow-wrap:anywhere] md:table-cell">
                    {r.referrer || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {topPaths.length > 1 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top paths
          </h2>
          <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
            {topPaths.map(([path, count]) => (
              <li key={path} className="flex items-baseline justify-between gap-2 rounded-md border bg-background px-2.5 py-1.5">
                <span className="font-mono text-[11px] [overflow-wrap:anywhere]">{path}</span>
                <span className="text-muted-foreground tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-lg font-semibold tabular-nums", mono && "font-mono text-base")}>
        {value}
      </p>
    </div>
  );
}
