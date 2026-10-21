/** App Hosting may expose an internal request URL after TLS termination.
 * Accept only the direct URL or the explicitly configured site origin;
 * forwarded headers cannot add trusted origins.
 */
export function isTrustedRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    const parsed = new URL(origin);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin) return false;
    const trusted = [new URL(request.url).origin];
    if (process.env.NEXT_PUBLIC_SITE_URL) trusted.push(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
    return trusted.includes(origin);
  } catch { return false; }
}
