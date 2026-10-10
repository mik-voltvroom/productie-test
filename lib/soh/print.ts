/** Shrink unusually long source data to one A4 page without truncating fields. */
export function sohPrintScale(contentHeight: number, availableHeight: number): number {
  if (!Number.isFinite(contentHeight) || !Number.isFinite(availableHeight) || contentHeight <= 0 || availableHeight <= 0)
    throw new Error("Afdrukformaat kon niet worden bepaald.");
  return Math.min(1, availableHeight / contentHeight);
}
