import { insforgeServer } from "@/lib/insforge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "dev-access-log",
  // Discourage search engines and link previews from picking this up.
  robots: { index: false, follow: false },
};

type Row = {
  id: string;
  ip: string | null;
  created_at: string;
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  // YYYY-MM-DD HH:MM:SS in the viewer's local time zone.
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export default async function DevAccessLogPage() {
  const { data, error } = await insforgeServer
    .database
    .from("access_log")
    .select("id, ip, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (data as Row[]) ?? [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-mono text-sm text-muted-foreground">dev-access-log</h1>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
        last 500 visits · ip + timestamp only
      </p>

      {error && (
        <p className="mt-4 font-mono text-xs text-destructive">
          load error: {error.message}
        </p>
      )}

      {rows.length === 0 && !error && (
        <p className="mt-6 font-mono text-xs text-muted-foreground">
          (no visits yet)
        </p>
      )}

      {rows.length > 0 && (
        <table className="mt-4 w-full font-mono text-xs">
          <thead>
            <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-2 py-1.5 text-left font-normal">timestamp</th>
              <th className="px-2 py-1.5 text-left font-normal">ip</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className={cn(
                  "border-b border-border/40",
                  i % 2 === 0 ? "" : "bg-muted/20"
                )}
              >
                <td className="px-2 py-1 tabular-nums text-foreground">
                  {formatTimestamp(r.created_at)}
                </td>
                <td className="px-2 py-1 tabular-nums [overflow-wrap:anywhere]">
                  {r.ip ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
