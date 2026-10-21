import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Photo Studio is nog niet geactiveerd: REMOVE_BG_API_KEY ontbreekt op de server." },
      { status: 503 },
    );
  }

  const input = await request.formData();
  const image = input.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Geen afbeelding ontvangen." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(image.type)) {
    return NextResponse.json({ error: "Alleen JPG, PNG en WebP zijn toegestaan." }, { status: 415 });
  }
  if (image.size === 0 || image.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Afbeelding moet kleiner zijn dan 20 MB." }, { status: 413 });
  }

  const providerForm = new FormData();
  providerForm.append("image_file", image, image.name || "vehicle.jpg");
  providerForm.append("size", "auto");
  providerForm.append("type", "car");
  providerForm.append("format", "png");

  try {
    const providerResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: providerForm,
      cache: "no-store",
    });

    if (!providerResponse.ok) {
      const details = await providerResponse.text();
      console.error("Photo Studio cutout provider error", providerResponse.status, details.slice(0, 500));
      return NextResponse.json({ error: "De auto kon niet betrouwbaar worden vrijstaand gemaakt." }, { status: 502 });
    }

    const bytes = await providerResponse.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Photo Studio cutout request failed", error);
    return NextResponse.json({ error: "De beeldservice is tijdelijk niet bereikbaar." }, { status: 502 });
  }
}
