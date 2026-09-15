const exactPublicRoutes = new Set([
  "/api/health",
  "/api/merchant-feed",
  "/api/leads",
  "/api/rdw/vehicle",
  "/api/trade-ins",
  "/api/trade-ins/lookup",
  "/api/public/social-videos",
  "/api/auth/session",
  "/api/auth/logout",
]);

const publicPrefixes = ["/api/portal/", "/api/public/social-videos/", "/portal/"];

// Machine-to-machine hooks are reachable without a browser session, but each
// handler must fail closed and validate its own secret.
const serviceHookRoutes = new Set(["/api/cron/sync", "/api/vwe/import", "/api/hexon/inventory"]);

export function isPublicRoute(pathname: string): boolean {
  return exactPublicRoutes.has(pathname)
    || serviceHookRoutes.has(pathname)
    || publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function isServiceHookRoute(pathname: string): boolean {
  return serviceHookRoutes.has(pathname);
}
