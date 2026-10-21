import { createHash, randomBytes } from "node:crypto";
export function newPortalToken() { return randomBytes(32).toString("base64url"); }
export function portalTokenId(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function portalAccessActive(value: { expiresAt?: string; revokedAt?: string | null } | undefined, now = new Date()) {
  return Boolean(value && !value.revokedAt && value.expiresAt && Date.parse(value.expiresAt) > now.getTime());
}
