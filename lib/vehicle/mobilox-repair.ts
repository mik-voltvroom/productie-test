import { createHash } from "node:crypto";
import { parseHexonMutation } from "@/lib/integrations/hexon";
import { prepareHexonImages } from "@/lib/integrations/hexon-images";
import { buildMobiloxReplacement } from "./mobilox";
import type { Vehicle } from "@/types";

export function vehicleDigest(value: unknown): string {
  function sorted(node: unknown): unknown {
    if (Array.isArray(node)) return node.map(sorted);
    if (node && typeof node === "object") return Object.fromEntries(Object.entries(node).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sorted(v)]));
    return node;
  }
  return createHash("sha256").update(JSON.stringify(sorted(value))).digest("hex");
}

function contentDigest(vehicle: Vehicle): string {
  const { updatedAt, source, publication, editorial, ...rest } = vehicle;
  return vehicleDigest({ ...rest,
    source: source && { ...source, lastMutationAt: undefined },
    publication: publication && { ...publication, lastValidatedAt: undefined },
    editorial: editorial && { ...editorial, photos: editorial.photos.map(({ importedAt, ...photo }) => photo) },
  });
}

/** Planning is pure: no database/network writes, exact payload and current-state preconditions. */
export async function planMobiloxRepair(current: Vehicle, xml: string, now: string) {
  const mutation = parseHexonMutation(xml, new Date(now));
  if (!mutation.vehicle || mutation.action !== "upsert" || mutation.vehicle.id !== current.id) throw new Error("Herstel vereist een volledige Mobilox-aanlevering voor hetzelfde voertuig.");
  const prepared = await prepareHexonImages(mutation.vehicle.images);
  if (prepared.failures.length) throw new Error("Herstel geweigerd: ongeldige Mobilox-foto-URLs.");
  const replacement = buildMobiloxReplacement(current, mutation.vehicle, prepared.photos, now, mutation.contentPresence);
  replacement.source!.payloadSha256 = createHash("sha256").update(xml).digest("hex");
  const changed = contentDigest(current) !== contentDigest(replacement);
  return { id: current.id, payloadSha256: createHash("sha256").update(xml).digest("hex"),
    beforeSha256: vehicleDigest(current), changed,
    changedFields: Object.keys({ ...current, ...replacement }).filter(key => vehicleDigest((current as unknown as Record<string, unknown>)[key] ?? null) !== vehicleDigest((replacement as unknown as Record<string, unknown>)[key] ?? null)),
    imageCount: replacement.images.length, optionCount: replacement.highlights.length,
    replacement };
}
