export function isLocalDemoAuthBypassAllowed(): boolean {
  return process.env.VVOS_ENV === "local"
    && process.env.VVOS_DATA_MODE === "demo"
    && process.env.VVOS_REQUIRE_AUTH === "false";
}

export function isAuthenticationRequired(): boolean {
  return !isLocalDemoAuthBypassAllowed();
}
