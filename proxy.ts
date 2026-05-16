import { NextResponse, type NextRequest } from "next/server";
import { insforgeServer } from "@/lib/insforge";

/**
 * Access log proxy (formerly middleware.ts in Next 15). Records every page
 * request so we can see when stakeholders open the demo. Skipped for API
 * routes, static assets, and the log endpoint itself (avoid recursion).
 *
 * proxy.ts runs on the Node.js runtime by default in Next 16, which lets us
 * write to InsForge directly in-process instead of bouncing a fetch through
 * the public load balancer. The old middleware.ts version did
 * `fetch("https://klarity.zeabur.app/api/log-access", ...)` which (a) was
 * killed by the Edge runtime before completing in production and (b) would
 * have had to make a public-DNS + TLS roundtrip back through Zeabur's LB even
 * if it ran on Node — fragile and slow. The direct InsForge insert below has
 * neither failure mode.
 */
export default function proxy(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const path = req.nextUrl.pathname;
  const userAgent = req.headers.get("user-agent") ?? "";
  const referrer = req.headers.get("referer") ?? "";

  // Fire-and-forget. Failures here must NEVER affect the user-facing response.
  // Node runtime keeps the promise alive in the event loop until it resolves.
  // The InsForge SDK returns a PromiseLike, so all error handling lives inside
  // the .then() — we can't chain .catch() here.
  void Promise.resolve(
    insforgeServer.database
      .from("access_log")
      .insert([{ path, ip, user_agent: userAgent, referrer }])
  )
    .then(({ error }) => {
      if (error) console.error("[proxy] access_log insert failed", error);
    })
    .catch(() => {
      /* swallow — logging is best-effort */
    });

  return NextResponse.next();
}

export const config = {
  matcher: [
    /**
     * Run on every page route, except:
     *  - /api/*           — too noisy, internal-to-internal traffic
     *  - /_next/*         — framework internals + build assets
     *  - /favicon.ico, /klarity-brand.svg — static brand assets
     *  - any file with an extension in the path (image / font / map files)
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|klarity-brand\\.svg|.*\\.[a-zA-Z]+$).*)",
  ],
};
