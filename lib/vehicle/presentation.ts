/** Present Mobilox's pipe-separated execution/highlights without changing source data. */
export function vehiclePresentation(trim: string | null | undefined): { edition: string; highlights: string[] } {
  const parts = (trim ?? "").split("|").map(part => part.replace(/\s+/g, " ").trim()).filter(Boolean);
  const edition = parts.shift() ?? "";
  const seen = new Set([edition.toLocaleLowerCase("nl")]);
  const highlights = parts.filter(part => {
    const key = part.toLocaleLowerCase("nl");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { edition, highlights };
}
