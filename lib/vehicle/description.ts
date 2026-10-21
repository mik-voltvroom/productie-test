export type DescriptionBlock = { type: "heading" | "paragraph" | "list"; lines: string[] };

/** Separate Mobilox's generated prefix from the authored copy that follows it.
 * Unknown formats remain intact rather than silently losing source text. */
export function vehicleDescription(description: string) {
  const lines = description.replace(/\r\n?/g, "\n").split("\n");
  const firstFact = lines.findIndex(line => /^\s*-\s*Merk\s*:/i.test(line));
  let generated = "";
  let authored = description.trim();
  if (firstFact >= 0) {
    let end = firstFact;
    const category = /^(?:Pakket\s*:.*|Comfort|Exterieur|Infotainment|Interieur|Milieu|Overige|Veiligheid)(?:\s*-\s*.*)?$/i;
    while (end < lines.length && (!lines[end].trim() || /^\s*-\s*/.test(lines[end]) || category.test(lines[end].trim()))) end++;
    // The line immediately before the facts is the generated vehicle title.
    let start = firstFact - 1;
    while (start >= 0 && !lines[start].trim()) start--;
    generated = lines.slice(Math.max(0, start), end).join("\n").trim();
    authored = lines.slice(end).join("\n").trim() || lines.slice(0, Math.max(0, start)).join("\n").trim();
  }
  return { authored, generated };
}

/** Render source copy as semantic text, never as provider HTML. */
export function descriptionBlocks(text: string): DescriptionBlock[] {
  const lines = text.replace(/\r\n?/g, "\n")
    // Mobilox's HTML-to-text conversion can join a heading and its first bullet.
    .replace(/([^\n])[-•]\s+(?=\S)/g, "$1\n- ")
    .split("\n").map(line => line.trim());
  const blocks: DescriptionBlock[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line) continue;
    const bullet = line.match(/^[-•]\s+(.+)/);
    if (bullet) {
      const previous = blocks.at(-1);
      if (previous?.type === "list") previous.lines.push(bullet[1]);
      else blocks.push({ type: "list", lines: [bullet[1]] });
    } else {
      const next = lines[index + 1];
      const heading = line.length <= 120 && !/[.!?:]$/.test(line)
        && (blocks.length === 0 || Boolean(next && (next.length > 120 || /^[-•]\s/.test(next))));
      blocks.push({ type: heading ? "heading" : "paragraph", lines: [line] });
    }
  }
  return blocks;
}

/** Preserve the provider's explicit quarterly label; never infer tax from weight. */
export function descriptionRoadTax(description?: string): string | undefined {
  return description?.match(/(?:^|\n)\s*-?\s*(?:Motorrijtuigenbelasting|Wegenbelasting)\s*:\s*(€\s*[\d.,]+(?:\s*[-–]\s*€?\s*[\d.,]+)?)\s*per kwartaal\s*(?=\n|$)/i)?.[1].trim();
}
