export interface HexonImageFailure {
  message: string;
}

export interface HexonIntegrationEvent {
  id: string;
  provider: "mobilox" | "mobilox-hexon";
  type: string;
  externalId: string;
  receivedAt: string | null;
  processedAt: string | null;
  result: string;
  imageFailures: HexonImageFailure[];
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeHexonIntegrationEvent(
  id: string,
  data: Record<string, unknown>,
): HexonIntegrationEvent | null {
  const provider = text(data.provider);
  if (provider !== "mobilox" && provider !== "mobilox-hexon") return null;

  const externalId = text(data.externalId) ?? text(data.sourceVehicleId) ?? "";
  const failures = Array.isArray(data.imageFailures) ? data.imageFailures : [];
  const imageFailures = failures.flatMap((failure) => {
    if (!failure || typeof failure !== "object") return [];
    const message = text((failure as Record<string, unknown>).message);
    return message ? [{ message }] : [];
  });

  return {
    id,
    provider,
    type: text(data.type) ?? "vehicle.unknown",
    externalId,
    receivedAt: text(data.receivedAt) ?? text(data.processedAt),
    processedAt: text(data.processedAt),
    result: text(data.result) ?? "unknown",
    imageFailures,
  };
}
