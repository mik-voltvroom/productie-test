import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Social Video security boundary", () => {
  it("houdt socialVideos buiten directe Firestore-clienttoegang", () => {
    const rules = read("firestore.rules");
    expect(rules).toContain("match /socialVideos/{videoId}");
    expect(rules).toContain("allow read, write: if false");
  });

  it("houdt de publieke video-API allow-listed en server-side", () => {
    const model = read("lib/social-video/model.ts");
    const publicRoute = read("app/api/public/social-videos/route.ts");
    expect(model).toContain("publicSocialVideoSchema");
    expect(publicRoute).toContain("listPublishedSocialVideos");
    expect(publicRoute).not.toContain("adminDb.collection");
  });

  it("staat alleen vooraf bekende socialproviders toe", () => {
    const providers = read("lib/social-video/providers.ts");
    expect(providers).toContain("isHost(url.hostname, \"youtube.com\")");
    expect(providers).toContain("isHost(url.hostname, \"tiktok.com\")");
    expect(providers).toContain("isHost(url.hostname, \"instagram.com\")");
  });

  it("zet gepubliceerde content na redactionele wijziging terug naar review", () => {
    const route = read("app/api/social-videos/[id]/route.ts");
    expect(route).toContain("hasEditorialMutation");
    expect(route).toContain('before.status === "published" && hasEditorialMutation && !parsed.data.status');
    expect(route).toContain('patch.status = "review"');
  });

  it("kan optionele relaties en metadata gecontroleerd leegmaken", () => {
    const route = read("app/api/social-videos/[id]/route.ts");
    expect(route).toContain("parsed.data.brand === null");
    expect(route).toContain("patch.brand = undefined");
    expect(route).toContain("parsed.data.vvVerifiedId === null");
    expect(route).toContain("patch.vvVerifiedId = undefined");
  });

  it("biedt een review-editor voor relaties en plaatsingen na import", () => {
    const manager = read("components/dashboard/SocialVideoManager.tsx");
    const editor = read("components/dashboard/SocialVideoEditor.tsx");
    expect(manager).toContain("<SocialVideoEditor");
    expect(editor).toContain("Review gegevens &amp; plaatsingen");
    expect(editor).toContain('name="vehicleIds"');
    expect(editor).toContain('name="vvVerifiedId"');
    expect(editor).toContain('name="carCheckId"');
  });

  it("maakt geen voertuig-URL door een intern vehicleId als slug te behandelen", () => {
    const component = read("components/SocialVideo.tsx");
    expect(component).toContain("vehicleHref?: string");
    expect(component).toContain("vehicleHref && video.vehicleIds.length > 0");
    expect(component).not.toContain("`/voorraad/${video.vehicleIds[0]}`");
  });
});
