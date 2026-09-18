# Icons design QA

- Source visual: `C:\Users\carou\.codex\generated_images\01a0aa3a-7760-76a2-a2cc-bab4f0776e39\exec-962f850b-5b9b-49cc-8e3d-48348340f1fb.png`
- Implementation: `http://127.0.0.1:4173/icons`
- Desktop viewport: 1440 × 900
- Mobile viewport: 390 × 844

## Captures

- `artifacts/icons-desktop-v2.png`
- `artifacts/icons-mobile-v2.png`
- `artifacts/icons-fullpage.png`
- `artifacts/icons-reference-comparison-v2.png`

## Comparison history

1. The first implementation used a strict split layout. This made the heading wrap too often and visually separated the vehicle from the copy.
2. The hero was refined so the editorial vehicle image spans the full section while copy sits over the quiet left image area. The second side-by-side comparison matches the source composition, hierarchy, palette, typography and controls much more closely.

## Checks

- Typography: Manrope hierarchy and compact copper labels are consistent with the selected direction.
- Layout: desktop hero, long-form vision, four selection principles, live inventory state and closing CTA have a coherent rhythm.
- Imagery: the supplied editorial car image is sharp, plate-free and correctly cropped on desktop; mobile intentionally stacks the image below the copy.
- Responsive behavior: at 390 px, `innerWidth`, `clientWidth` and `scrollWidth` all equal 390; no horizontal overflow.
- Content: the Icons promise is specific, non-absolute and explains history, originality, technical context and lasting relevance.
- Inventory state: the empty state is truthful when no published vehicle is marked as an Icon. The page links to `/voorraad?collectie=icons`, `/voorraad` and `/contact`.
- Accessibility: semantic headings, useful image alt text, visible focus styling inherited from the site, keyboard-reachable links and practical mobile tap targets are present.
- Interaction: both hero anchors and all inventory/contact links resolve to the intended local destinations.
- Console/browser: the embedded preview could not initialize because Windows denied its sandbox helper; the same local build was therefore inspected in installed Edge with desktop and emulated-mobile captures.

## Findings

- Resolved: desktop hero composition drift from the source visual.
- Resolved: mobile viewport measurement and horizontal-overflow uncertainty.
- No open severity 1–3 visual, responsive, content or interaction findings.

final result: passed
