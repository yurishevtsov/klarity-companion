import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  showWordmark?: boolean;
};

export function KlarityMark({ className, showWordmark = true }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative inline-flex h-3 w-3">
        <span
          className="absolute inset-0 rounded-full opacity-50 blur-[2px]"
          style={{ background: "var(--brand-cyan)" }}
        />
        <span
          className="relative h-3 w-3 rounded-full"
          style={{ background: "var(--brand-blue)" }}
        />
      </span>
      {showWordmark && (
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
          Klarity Companion
        </span>
      )}
    </span>
  );
}
