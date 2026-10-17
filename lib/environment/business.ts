export interface SiteEnvironment {
  [key: string]: string | undefined;
  VVOS_ENV?: string;
  VVOS_DATA_MODE?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_ENV?: string;
}

/** Shared with the environment validator. Missing configuration never enables indexing. */
export function siteConfiguration(env: SiteEnvironment) {
  let origin = "https://www.voltvroom.nl";
  let validOrigin = false;
  try {
    const url = new URL(env.NEXT_PUBLIC_SITE_URL ?? "");
    validOrigin = ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      && url.pathname === "/" && !url.search && !url.hash;
    if (validOrigin) origin = url.origin;
  } catch { /* Retain the canonical fallback, with indexing disabled. */ }
  const productionOrigin = validOrigin && ["https://www.voltvroom.nl", "https://voltvroom.nl"].includes(origin);
  if (productionOrigin) origin = "https://www.voltvroom.nl";
  const indexable = env.VVOS_ENV === "production" && env.VVOS_DATA_MODE === "firebase"
    && productionOrigin && (!env.VERCEL_ENV || env.VERCEL_ENV === "production");
  return { origin, validOrigin, productionOrigin, indexable };
}

export function publicInventoryMode(env: SiteEnvironment): "firebase" | "demo" {
  if (env.VVOS_ENV === "production" && env.VVOS_DATA_MODE !== "firebase") {
    throw new Error("Production public inventory requires Firebase mode");
  }
  return env.VVOS_DATA_MODE === "firebase" ? "firebase" : "demo";
}
