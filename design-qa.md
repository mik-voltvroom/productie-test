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

# Mobiele routeknop optie 1 — design QA

## Vergelijkingsbasis

- Source visual truth: `C:\Users\carou\.codex\generated_images\01a0aa3a-7760-76a2-a2cc-bab4f0776e39\exec-3c91e67c-fc0d-44ac-9754-6e4fdfcb082f.png`
- Implementatie, volledige mobiele pagina: `C:\Users\carou\.codex\visualizations\2026\09\16\01a0aa3a-7760-76a2-a2cc-bab4f0776e39\route-button-qa\qa-route-button-822-page-v2.png`
- Genormaliseerde gerichte vergelijking: `C:\Users\carou\.codex\visualizations\2026\09\16\01a0aa3a-7760-76a2-a2cc-bab4f0776e39\route-button-qa\qa-route-button-comparison-v2.png`
- Viewports: 390 × 844 en 822 × 500 CSS-pixels, device scale factor 1.
- Sourcepixels: 2048 × 1024; gebruikte sourcecrop: 1968 × 230.
- Implementatiepixels: 822 × 500; mobiele actiebalk: 783 × 70 CSS-pixels.
- Staat: homepage bovenaan, mobiele actiebalk zichtbaar en niet verborgen door een formulier.

## Fidelity-controle

- Typografie: bestaande Inter-interfaceletter en gewicht 700 zijn behouden; tekst blijft exact `Route` en past zonder afbreken.
- Spacing en layout: drie gelijke gridkolommen, bestaande balkhoogte en tappunten blijven behouden. De routeknop heeft dezelfde buitenmaat als Bel en WhatsApp.
- Kleur en tokens: Route gebruikt Deep Ink `#0D1117`, Ice Blue `#E6F2FF`, Electric Blue `#168BFF` en wit voor voldoende contrast.
- Iconen: het bestaande repo-eigen navigatie-icoon blijft gebruikt, nu als gevuld blauw icoon in een ronde Ice Blue-drager.
- Beeldkwaliteit: geen nieuwe rasterasset nodig; de vorm blijft scherp op iedere schermdichtheid.
- Copy: `Bel`, `WhatsApp` en `Route` zijn ongewijzigd.
- Responsive: op 390 px blijft de routeknop horizontaal leesbaar; boven 900 px blijft de bestaande verticale contactdock ongewijzigd en zichtbaar.
- Interactie en toegankelijkheid: de routeknop opent een modal met Google Maps, Apple Kaarten en Waze; de modal heeft een toegankelijke naam, sluit met Escape en geeft de focus terug aan de routeknop.
- Browserconsole: geen fouten.
- Focused comparison: noodzakelijk omdat de wijziging uitsluitend de routeknop betreft; de gerichte vergelijking toont bron en implementatie in dezelfde compositie.

## Vergelijkingsgeschiedenis

1. Eerste vergelijking — P2: het route-icoon werd als lijncontour weergegeven, terwijl de gekozen bron een gevuld blauw navigatie-icoon toont.
2. Correctie: `fill: currentColor` en `stroke: none` uitsluitend op het mobiele route-icoon toegepast.
3. Tweede vergelijking: icoon, Deep Ink-oppervlak, ronde Ice Blue-drager en blauwe onderlijn sluiten aan op optie 1. Geen resterende P0-, P1- of P2-afwijkingen.

## Restpunten

- De zwarte `N`-indicator in ontwikkelcaptures is Next.js-ontwikkelchrome en maakt geen deel uit van de productie-interface.
- De source visual is bewust ruimer en scherper gerenderd dan de productiecomponent; de implementatie behoudt de bestaande responsieve maatvoering van de website.

final result: passed

## Routekeuze — aanvullende functionele QA

- Open-state: `C:\Users\carou\.codex\visualizations\2026\09\16\01a0aa3a-7760-76a2-a2cc-bab4f0776e39\route-button-qa\qa-route-chooser-mobile.png`
- Viewport: 390 × 844 CSS-pixels.
- De open-state was niet uitgewerkt in de gekozen bron; daarom is deze beoordeeld op dezelfde Deep Ink-, Ice Blue- en Electric Blue-tokens en op aansluiting bij de bestaande mobiele actiebalk.
- Google Maps, Apple Kaarten en Waze hebben elk een geldige route-URL en openen veilig in een nieuw tabblad met `noopener noreferrer`.
- De laatst gekozen route-app wordt lokaal onthouden en bij heropening gemarkeerd met `Laatst gebruikt`.
- Escape sluit de modal en herstelt de focus naar de routeknop.
- De productiebuild is geslaagd; de bestaande, niet-door-deze-wijziging-veroorzaakte autoprefixer-waarschuwingen blijven zichtbaar.
- Browserconsole: geen fouten.

final result: passed

---

# Homepage vehicle-card alignment — design QA

## Reference

- User-supplied live desktop screenshot at 1920 × 1030.
- Focus: the three inventory cards, especially the Volvo card with a long Mobilox title.

## Reproduction and comparison

- Reproduced the three live vehicle shapes locally, including the long pipe-separated Volvo and Tesla descriptions.
- Captured the inventory section before and after the CSS correction in the in-app browser.
- Compared the corrected preview with the supplied screenshot at the same three-column state.

## Fixed findings

- P1: long Mobilox text forced the first card beyond its grid track, clipping the price and action button.
- P1: the flexible badge row stretched short badge sets into large circular controls.
- P2: model and price alignment was unstable when either value became wider.

## Verification

- All three cards measured 377 px wide.
- Card bodies, headings and metadata reported equal client and scroll widths: no horizontal overflow.
- All three action buttons measured 327 × 44 px and shared the same vertical position.
- All badges remained 34 px high.
- The mobile breakpoint stacks the heading to one column and inherits the zero-min-width overflow protection.
- Browser console: no errors introduced by this change.

final result: passed
