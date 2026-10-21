import { HEXON_MAX_BODY_BYTES, hexonCredentialsConfigured, processHexonInventoryXml, verifyHexonAuthorization } from "@/lib/integrations/hexon-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function plain(value: "0" | "1", status: number): Response {
  return new Response(value, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

function failureStatus(error: unknown): number {
  if (error instanceof Error && error.message === "VVOS database niet beschikbaar.") return 503;
  return 400;
}

export async function POST(request: Request): Promise<Response> {
  const requestContext = {
    contentLength: request.headers.get("content-length"),
    contentType: request.headers.get("content-type"),
    userAgent: request.headers.get("user-agent")?.slice(0, 120) ?? null,
  };
  if (!hexonCredentialsConfigured()) {
    console.error("Hexon inventory mutation rejected", { ...requestContext, status: 503, reason: "credentials_not_configured" });
    return plain("0", 503);
  }
  if (!verifyHexonAuthorization(request.headers.get("authorization"))) {
    console.warn("Hexon inventory mutation rejected", { ...requestContext, status: 401, reason: "invalid_authorization" });
    return plain("0", 401);
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("xml")) {
    console.warn("Hexon inventory mutation rejected", { ...requestContext, status: 415, reason: "unsupported_content_type" });
    return plain("0", 415);
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > HEXON_MAX_BODY_BYTES) {
    console.warn("Hexon inventory mutation rejected", { ...requestContext, status: 413, reason: "declared_body_too_large" });
    return plain("0", 413);
  }

  try {
    const xml = await request.text();
    const bodyBytes = Buffer.byteLength(xml, "utf8");
    if (bodyBytes > HEXON_MAX_BODY_BYTES) {
      console.warn("Hexon inventory mutation rejected", { ...requestContext, bodyBytes, status: 413, reason: "actual_body_too_large" });
      return plain("0", 413);
    }
    const result = await processHexonInventoryXml(xml);
    console.info("Hexon inventory mutation accepted", { ...requestContext, bodyBytes, status: 200, ...result });
    return plain("1", 200);
  } catch (error) {
    const status = failureStatus(error);
    console.error("Hexon inventory mutation rejected", {
      ...requestContext,
      status,
      reason: error instanceof Error ? error.message : "unknown_error",
    });
    return plain("0", status);
  }
}
