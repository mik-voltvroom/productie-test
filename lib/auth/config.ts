export function isLocalDemoAuthBypassAllowed(): boolean {
  return process.env.VVOS_ENV === "local"
    && !process.env.K_SERVICE && !process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCLOUD_PROJECT
    && process.env.VVOS_DATA_MODE === "demo"
    && process.env.VVOS_REQUIRE_AUTH === "false";
}

export function isAuthenticationRequired(): boolean {
  return !isLocalDemoAuthBypassAllowed();
}
