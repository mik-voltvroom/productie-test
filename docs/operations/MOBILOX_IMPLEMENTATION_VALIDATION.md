# Validatie Mobilox-herstel — 6 oktober 2026

## Status

Geïmplementeerd op branch `agent/mobilox-authoritative-inventory`, gebaseerd op het aangeleverde archief van productiecommit `2987642039c302a8b15ec29c07f408ac9333c84b`. Op 7 oktober is GitHub-toegang tot `mik-voltvroom/productie` bevestigd: main staat exact op deze archiefcommit. Geen productiegegevens gemuteerd en geen deploy/merge uitgevoerd.

De lokale Git-baseline is opgebouwd uit het ZIP-bestand en heeft niet de originele Git-geschiedenis. Gebruik de meegeleverde patch op een echte checkout; push deze synthetische baseline niet als vervanging van main.

## Uitgevoerde controles

| Controle | Resultaat |
| --- | --- |
| Gerichte Vitest-run (importservice, parser, foto’s, editorial, interne API/domein, deal, hooks) | 10 bestanden, 60 tests geslaagd |
| Volledige Vitest-run | 46 bestanden: 45 geslaagd, 1 gefaald; 288 tests geslaagd, 2 gefaald |
| Ongewijzigde archiefbaseline met dezelfde lokale dependencies | Dezelfde 2 UUID-compatibiliteitsfouten in `tests/dependency-security.test.ts`; 283 overige tests geslaagd |
| TypeScript `tsc --noEmit` | Alleen ontbrekende dependency `qrcode.react` in bestaande `ShowroomCard.tsx`; dezelfde diagnose op ongewijzigde baseline. Geen geslaagde volledige typecheck |
| `npm run build` | Geblokkeerd: `qrcode.react` niet geïnstalleerd; webpack stopt in bestaande showroomkaart |
| `npm run lint` | Bestaand `next lint` vraagt om eerste ESLint-configuratie; geen lintresultaat. Geen configuratie ongevraagd toegevoegd |
| `npm run test:rules` | Emulator start niet: Java-runtime ontbreekt. Firestore-regeltests aangepast maar niet uitgevoerd |
| Storage-regels | Broncontrole; geen uitgevoerde Storage-emulatortest |
| `repo:guard`, `agent:audit`, `brand:audit` | Alle drie geslaagd |
| `git diff --check` | Geslaagd |
| Herstel-CLI offline | Dry-run op expliciet synthetische XML + documentexport: `would-repair`, 1 foto, 0 opties; plan geschreven, geen database gebruikt |
| Herstel-idempotentie/concurrentie | Planfunctie en interne concurrentiecontrole getest; productie-apply niet uitgevoerd |
| Visueel mobiel/tablet/desktop | Niet uitgevoerd: lokale Next-server kan niet luisteren (`EPERM` op 127.0.0.1:3117) |
| Ford: actuele payload ↔ Firestore ↔ publieke pagina | Niet uitgevoerd: geen actuele XML, database-export of eenduidige voertuigidentificatie aangeleverd |

## Afhankelijkheidsbeperking

`npm ci --offline --ignore-scripts --no-audit --no-fund` geprobeerd met lokale caches, maar de vereiste packages zijn niet volledig aanwezig (onder meer UUID 11.1.1). Een online pakketverzoek faalt op DNS voor registry.npmjs.org. Er is daarna een kopie van reeds lokaal beschikbare dependencies gebruikt, zonder de andere checkout te wijzigen.

Werkelijke lokale versies: Node 24.19.0, Next 15.5.25, Vitest 5.0.1, TypeScript 5.9.3, fast-xml-parser 5.10.1. Het productie-lockbestand vraagt onder andere Next 15.5.27 en qrcode.react 4.2.0. `package.json` en `package-lock.json` zijn niet gewijzigd. Deze resultaten vervangen geen clean-install-CI op Node 22 en het exacte lockbestand. De UUID-fouten zijn aantoonbaar gelijk in de lokale baseline, maar daarmee is niet bewezen dat de actuele productie-CI dezelfde fouten heeft.

## Nog vereist vóór livegang

1. Bij review opnieuw de actuele main vergelijken. Bij publicatie van deze wijziging kwam main exact overeen met de archiefcommit.
2. Exacte dependencies installeren; volledige typecheck, tests, productiebuild, Firestore-/Storage-regelvalidatie en lintconfiguratie controleren.
3. Mobiele, tablet- en desktopcontrole van het vereenvoudigde dossier, specificaties en 3:2-galerij uitvoeren.
4. Een actuele volledige Mobilox-aanlevering bevestigen, waaronder de bronsemantiek van `change`, fotovolgorde en uitbreidingsvelden. De nieuwe velden zijn gebaseerd op reeds aanwezige adaptermappings, niet op een nieuw bevestigd providercontract.
5. Productieproject en deploymentdoel onafhankelijk vaststellen: archiefdocumentatie/configuratie bevat stagingverwijzingen. Deze bestaande inconsistentie is niet gewijzigd.
6. De Ford identificeren en een dry-run met de echte bron maken. Bespreek niet-gematchte legacy/VWE-voertuigen apart.
7. Pull request reviewen. Merge, code-/regeldeploy en de dataherstelrun blijven afzonderlijke expliciet te autoriseren acties.

Voor commando’s, schrijfgrenzen, overdracht en herstel: [MOBILOX_SOURCE_OF_TRUTH.md](./MOBILOX_SOURCE_OF_TRUTH.md).
