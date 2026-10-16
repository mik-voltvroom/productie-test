export function vehicleContactHref(vehicleId: string, intent: "proefrit" | "vraag") {
  return `/contact?${new URLSearchParams({ vehicleId, intent })}#aanvraag`;
}
