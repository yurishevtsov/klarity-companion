import { NextResponse, type NextRequest } from "next/server";

/**
 * Access log proxy (formerly middleware.ts in Next 15). Fires a small
 * fire-and-forget POST on every page request so we can see when stakeholders
 * open the demo. Skipped for API routes, static assets, and the log endpoint
 * itself (avoid recursion).
 *
 * proxy.ts runs on the Node.js runtime by default in Next 16, which keeps
 * the function alive long enough for the fire-and-forget fetch to complete.
 * The same logic on Edge-runtime middleware.ts terminated the fetch when the
 * response returned, so production hits silently dropped.
 */
export default function proxy(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const path = req.nextUrl.pathname;
  const userAgent = req.headers.get("user-agent") ?? "";
  const referrer = req.headers.get("referer") ?? "";

  // Build absolute URL for the internal POST. Use the request's own origin so
  // it works whether running on Zeabur or localhost.
  const logUrl = new URL("/api/log-access", req.url);

  // Fire-and-forget. Failures here must NEVER affect the user-facing response.
  void fetch(logUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, ip, user_agent: userAgent, referrer }),
  }).catch(() => {
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
