import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { KlarityMark } from "@/components/klarity-mark";

export const metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-6 px-6 py-16">
      {/* Subtle brand glow, same accent as the home hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-72 w-[42rem] -translate-x-1/2 rounded-full opacity-15 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--brand-cyan), transparent 70%)",
        }}
      />

      <KlarityMark />

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          That page <span style={{ color: "var(--brand-blue)" }}>doesn&apos;t exist</span>.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Could be a deleted patient slug, a stale link, or a typo. The demo
          home page has the working entries.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className={buttonVariants({ size: "lg" })}
        >
          ← Back to home
        </Link>
        <Link
          href="/about"
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary/50 hover:bg-primary/10"
        >
          About this project →
        </Link>
      </div>
    </main>
  );
}
