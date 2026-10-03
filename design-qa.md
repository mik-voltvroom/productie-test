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

---

# Design QA — VVOS showroomkaart optie 2

## Referentie

- Geselecteerd ontwerp: optie 2, A4-portret.
- Controle op: visuele hiërarchie, prijspositie, voertuigfoto, vier kernwaarden, QR-blok en voertuigidentiteit.

## Uitgevoerde controle

- Lokale VVOS-route gecontroleerd in de Codex-browser op desktopbreedte.
- De referentie en de gebouwde preview naast elkaar beoordeeld.
- Lange voertuignaam en een wegenbelasting-bandbreedte gecontroleerd op afbreken en uitlijning.
- Browserconsole gecontroleerd: geen fouten of waarschuwingen.
- Definitieve kaart gebruikt de officiële Volt & Vroom-logo- en icoonbestanden.

## Iteraties

1. Ongeldige CSS-font shorthand hersteld, zodat Manrope de prijs en voertuigkop correct weergeeft.
2. Hero en footer vergroot om het volledige A4-oppervlak evenwichtig te benutten.
3. Kernwaarde-iconen in Ice Blue gezet en prijsblok sterker aangezet volgens optie 2.
4. Printweergave afgeschermd van VVOS-navigatie en zwevende contactknoppen.

## Resultaat

- Geen zichtbare overflow, afgesneden kernwaarden of botsende tekst.
- De kaart behoudt de gekozen diagonale beeldtaal en duidelijke scanroute.
- Ontbrekende brondata wordt als `Niet opgegeven` getoond en niet verzonnen.

final result: passed

---

# Showroomkaart design QA

- Source visual truth: `C:\Users\carou\.codex\visualizations\2026\09\16\01a0aa3a-7760-76a2-a2cc-bab4f0776e39\showroom-card-qa\reference.png`
- Final implementation screenshot: `C:\Users\carou\.codex\visualizations\2026\09\16\01a0aa3a-7760-76a2-a2cc-bab4f0776e39\showroom-card-qa\implementation-v2.png`
- Side-by-side comparison: `C:\Users\carou\.codex\visualizations\2026\09\16\01a0aa3a-7760-76a2-a2cc-bab4f0776e39\showroom-card-qa\comparison-v2.png`
- Browser viewport: 1200 x 1400 CSS px at device scale 1.
- A4 component: 793.7 x 1122.5 CSS px, matching 210 x 297 mm.
- Source pixels: 1024 x 1536. The source was proportionally fitted into a 794 x 1123 comparison frame without cropping; the implementation was captured at its native A4 CSS size.
- State: local VVOS demo vehicle, A4 portrait preview, controls enabled.

## Full-view comparison

The final implementation preserves the reference hierarchy and proportions: branded diagonal header, dynamic price placard over the vehicle photo, four equal fact columns, QR panel, vehicle title and compact contact footer. The generated ice-blue overlay is a real raster asset; the official lockup is preserved from the supplied visual rather than redrawn. Vehicle photo, price, drivetrain, facts, QR target and title remain dynamic.

## Focused comparison

The header/price and footer/title regions were checked separately because the full A4 comparison makes type details small. Manrope is explicitly applied to price, facts and vehicle title; Inter remains the interface/body family. The final colors use Deep Ink `#0D1117`, Electric Blue `#168BFF` and restrained Ice Blue. QR contrast and address text remain legible at A4 print size.

## Comparison history

### Iteration 1

- P1: the existing SVG lockup rendered its text with a serif fallback in this image context, unlike the supplied sans-serif official lockup.
- P2: the vehicle title inherited the dashboard's graphite color and Inter family instead of the reference's Deep Ink Manrope heading.

Fixes: extracted the supplied official lockup pixels into a dedicated card asset; explicitly set Manrope and Deep Ink on the vehicle title and display values.

### Iteration 2

Post-fix evidence is recorded in `implementation-v2.png` and `comparison-v2.png`. No actionable P0, P1 or P2 differences remain. The different vehicle crop, model name, price and drivetrain are expected dynamic-content differences rather than design drift.

## Interaction and technical checks

- Back navigation: tested successfully from the showroom card to the vehicle dossier and back.
- Print A4 control: visible and enabled.
- Console errors: none.
- A4 dimensions: verified in the browser at 210 x 297 mm.

## Findings

No blocking or moderate design mismatches remain.

## Follow-up polish

- P3: exceptionally long brand/model combinations may wrap to two lines; this is deliberate to preserve the full vehicle name instead of truncating it.
- P3: the exact hero crop depends on the source photo supplied by Mobilox.

final result: passed
