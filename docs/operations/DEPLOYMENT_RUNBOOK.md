# VVOS deployment runbook

## Staging-wijziging

Deze repository is de staging-codebase. `main` is uitsluitend de bronbranch van de Firebase staging-backend; vanuit deze repository wordt niet naar productie uitgerold.

1. Maak `agent/<korte-naam>` of `feature/<korte-naam>` vanaf `main`.
2. Wijzig code en documenteer env- of datamigratie-impact.
3. Run `npm ci` en `npm run check`.
4. Open een draft-PR naar `main`.
5. Vereis groene CI en minimaal één eigenaar-review.
6. Merge naar `main`; Firebase App Hosting staging mag daarna automatisch uitrollen.
7. Controleer `/api/health`, homepage, login en een interne API zonder sessie (verwacht 401).
8. Controleer VWE-, Hexon- en cron-hooks zonder/ongeldig secret (verwacht 401 of 503).
9. Noteer commit-SHA, smokecheckresultaat en eventuele rollback-SHA.

## Eerste App Hosting-rollout

1. Merge de goedgekeurde staging-PR naar `main`; verbind niet eerst de oude `main`-inhoud.
2. Configureer de Firebase GitHub App voor toegang tot de private repository `mik-voltvroom/staging`.
3. Maak in project `voltvroom-staging` een backend in `europe-west4` met app root `/` en live branch `main`.
4. Controleer dat `apphosting.yaml` alleen `voltvroom-staging` en de zes staging-secret-namen bevat.
5. Geef de nieuwe runtime service identity per secret de rol `Secret Manager Secret Accessor`; geef geen projectbrede eigenaarrol.
6. Maak via Firebase Authentication een eigenaaraccount en stel met een gecontroleerde Admin SDK-handeling de custom claim `{ role: "owner" }` in.
7. Start de rollout en controleer dat Firestore- en Storage-toegang zonder geldige auth gesloten blijven.
8. Voer de staging-smokechecks hierboven uit. Activeer App Check enforcement pas na een geslaagde webappregistratie en test.

Als de private GitHub-import niet beschikbaar is, mag de eerste backend als gecontroleerde fallback vanaf lokale bron worden uitgerold met Firebase CLI v14.4.0 of nieuwer. Gebruik alleen de getrackte inhoud van de goedgekeurde commit, leg die SHA vast en koppel GitHub daarna in de Deployment-tab. Deze fallback vervangt nooit de vereiste PR-goedkeuring.

De repository bevat hiervoor een staging-only `apphosting`-target in `firebase.json`:

1. Meld de Firebase CLI aan met het gecontroleerde eigenaaraccount.
2. Maak backend `vvos-staging` eenmalig aan in `europe-west4`, gekoppeld aan Firebase Web App `1:241472991923:web:75467e4adfacf620e936c6` en runtime `nodejs22`.
3. Geef de runtime service identity per secret toegang met `firebase apphosting:secrets:grantaccess`.
4. Rol alleen deze backend uit met `firebase deploy --only apphosting:vvos-staging --project staging`.
5. Noteer de bron-SHA en voer alle staging-smokechecks uit voordat GitHub continuous deployment wordt gekoppeld.

### Bekende eerste-rolloutblokkades

- PR #1 is na expliciete eigenaar-goedkeuring als commit `543586f87f532875b9c5af5a5e5cccd9b46064bd` naar staging `main` gemerged; de post-merge `quality`-check is geslaagd.
- De eerste lokale bronrollout is op 14 augustus 2026 geslaagd vanaf commit `e6960b16bf6e15d7a38797015df8efac454c360b`. Backend: `vvos-staging`; URL: `https://vvos-staging--voltvroom-staging.europe-west4.hosted.app`.
- De eerste smokecheck is geslaagd: homepage en health `200`; interne API, VWE en cron zonder autorisatie `401`.
- De Firebase GitHub App moet op het persoonlijke account worden geïnstalleerd met toegang tot alleen `mik-voltvroom/staging`.
- Op 17 augustus 2026 is Firebase App Hosting-backend `vvos-staging` gekoppeld aan GitHub-account `mik-voltvroom`, repository `staging`, app root `/` en testbranch `agent/design-system-v1-2`. Een handmatige GitHub-rollout gaf vóór de build een generieke consolefout; deze statuscommit verifieert de automatische push-trigger zonder `main` of productie te wijzigen.
- PR #2 moet nog worden gereviewd en gemerged voordat `main` de geteste App Hosting-configuratie bevat.
- Er is nog geen Firebase Authentication-eigenaaraccount met gecontroleerde `{ role: "owner" }` custom claim.

## Promotie naar productie

1. Noteer de op staging geaccepteerde commit-SHA en testresultaten.
2. Open in een afzonderlijke private productierepository een PR die exact die snapshot overneemt.
3. Controleer dat production eigen Firebase-project, backend, domein en secrets gebruikt.
4. Draai `npm run check`, `npm run validate:env` en `npm run readiness` met production-configuratie.
5. Vereis expliciete eigenaar-goedkeuring en een protected GitHub Environment.
6. Rol handmatig uit; automatiseer pas nadat rollback en credentials aantoonbaar zijn getest.
7. Voer smokechecks uit en leg release, tijdstip en rollback-SHA vast.

## Rollback

1. Stop verdere rollouts en leg de fout en actieve SHA vast.
2. Rol in dezelfde Firebase-omgeving terug naar de laatst bekende gezonde rollout.
3. Herhaal health-, auth- en kernroutechecks.
4. Maak een incidentnotitie; herstel via een nieuwe PR, nooit via een directe push.

Nooit direct ontwikkelen in `main`. Nooit production-secrets in deze repository committen. Nooit vanuit deze staging-repository naar productie deployen.
