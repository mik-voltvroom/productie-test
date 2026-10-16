import type { Vehicle } from "@/types";

type CardPhotoFraming = { imageUrl: string; x: number; y: number };

/**
 * Vehicle ID -> focal position in percent (0–100, default 50/50).
 * Bind each override to the exact first photo URL so a new Mobilox photo
 * cannot accidentally inherit the previous composition. No photo is modified.
 * Example: "vehicle-id": { imageUrl: "https://…/front.jpg", x: 45, y: 55 }
 */
export const vehicleCardPhotoFraming: Readonly<Record<string, CardPhotoFraming>> = {};

export function vehicleCardImagePosition(
  vehicle: Pick<Vehicle, "id" | "images">,
  framing: Readonly<Record<string, CardPhotoFraming>> = vehicleCardPhotoFraming,
): string {
  const position = framing[vehicle.id];
  if (!position || position.imageUrl !== vehicle.images[0]) return "50% 50%";
  const percent = (value: number) => Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50;
  return `${percent(position.x)}% ${percent(position.y)}%`;
}
