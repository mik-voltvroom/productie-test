# Agent Run 003 — VVOS 1.0 Release Candidate

## Uitgevoerd

- Versie verhoogd naar `1.0.0-rc.1`.
- Kernlead-API schrijft in Firebase-modus naar Firestore en levert in demo-modus een expliciete demo-respons.
- Centrale server repository-helper toegevoegd voor Firestore/fallbackgedrag.
- Dynamische dashboard- en dossierpagina's expliciet gemarkeerd om onbedoelde prerendering te voorkomen.
- Vitest toegevoegd met regressietests voor voertuigmarges, publicatievalidatie, btw, facturen, debiteuren en voertuigwinst.
- CI uitgebreid met repository-audit en tests.
- Productie-readiness-script toegevoegd.
- Lokale runtime-smoketest uitgevoerd op `/` en `/api/health`; beide retourneerden HTTP 200.

## Verificatie

- `npm run agent:audit`: geslaagd.
- `npm run typecheck`: geslaagd.
- `npm run test`: 7/7 tests geslaagd.
- `next dev`: start binnen circa twee seconden.
- `/api/health`: HTTP 200.
- `/`: HTTP 200.
- `next build`: compileert en typecheckt, maar de huidige geïsoleerde container blijft hangen bij `Collecting page data`. Er is geen compileer- of typefout gemeld. Dit moet nogmaals in GitHub Actions of de uiteindelijke hostingomgeving worden gevalideerd.

## Externe blokkades voor echte livegang

- Firebase-project en secrets.
- VWE/RDW-providercontracten en API-toegang.
- Google Merchant Center Vehicle Ads-toelating en credentials.
- E-mail-, WhatsApp-, betaal- en e-signprovider.
- Accountantscontrole op btw/margeregeling en grootboekinrichting.
- Acceptatietest met echte gebruikersrollen en representatieve data.
