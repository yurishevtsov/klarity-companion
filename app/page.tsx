import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import DemoResetButton from "./DemoResetButton";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
        Klarity Companion
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance">
        The 23 hours and 50 minutes between visits.
      </h1>
      <p className="mt-4 max-w-xl text-base text-muted-foreground">
        AI care layer for psych and ADHD telehealth practices. Coach for
        patients, Sentinel voice check-ins, and a unified clinician dashboard.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="bg-card text-card-foreground rounded-2xl border p-6">
          <h2 className="text-lg font-semibold">Patient surfaces</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inbound text coach + outbound Sentinel voice agent.
          </p>
          <Link
            href="/coach/sarah"
            className={buttonVariants({ size: "lg", className: "mt-5 w-full" })}
          >
            Open Coach (demo)
          </Link>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl border p-6">
          <h2 className="text-lg font-semibold">Clinician view</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Patient roster with risk badges and longitudinal context.
          </p>
          <Link
            href="/clinician"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-5 w-full" })}
          >
            Open Dashboard
          </Link>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Demo data only. Not a substitute for medical advice. If in crisis, call or text 988.
        </p>
        <DemoResetButton />
      </div>
    </main>
  );
}
