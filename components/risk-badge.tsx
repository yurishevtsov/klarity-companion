import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/chat";

const STYLES: Record<RiskLevel, string> = {
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  high: "bg-red-500/15 text-red-700 dark:text-red-400 ring-1 ring-red-500/40",
};

const LABEL: Record<RiskLevel, string> = {
  low: "OK",
  medium: "Watch",
  high: "Risk",
};

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        STYLES[level],
        className
      )}
    >
      {LABEL[level]}
    </span>
  );
}
