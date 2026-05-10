import { createClient } from "@insforge/sdk";

const url = process.env.NEXT_PUBLIC_INSFORGE_URL;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_INSFORGE_URL or NEXT_PUBLIC_INSFORGE_ANON_KEY in environment."
  );
}

export const insforgeServer = createClient({
  baseUrl: url,
  anonKey,
  isServerMode: true,
});

export function insforgeBrowser() {
  return createClient({ baseUrl: url!, anonKey: anonKey! });
}
