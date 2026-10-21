import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/auth/api";
import { writeAuditEvent } from "@/lib/audit/audit-log";

const schema = z.object({
  channel: z.enum(["email", "whatsapp"]),
  to: z.string().min(3),
  template: z.string().min(1),
  variables: z.record(z.string()).optional(),
});

export async function POST(request: Request) {
  const auth = await authorizeApi(request, "communications.send");
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige communicatieopdracht" }, { status: 400 });
  const emailReady = Boolean(process.env.EMAIL_API_URL && process.env.EMAIL_API_KEY);
  const whatsappReady = Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_TOKEN);
  const ready = parsed.data.channel === "email" ? emailReady : whatsappReady;
  await writeAuditEvent({ action: "communication.prepared", entityType: "communication", actor: auth.actor, outcome: ready ? "success" : "warning", metadata: { channel: parsed.data.channel, template: parsed.data.template, recipientMasked: parsed.data.to.slice(-4).padStart(parsed.data.to.length, "*") }, request });
  if (!ready) return NextResponse.json({ mode: "preview", sent: false, message: "Provider nog niet geconfigureerd; bericht veilig als preview verwerkt.", payload: parsed.data });
  return NextResponse.json({ mode: "live", sent: false, message: "Adapter is gereed. Activeer de provider-specifieke mutatie pas na een geslaagde sandbox-test." });
}
