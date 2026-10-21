# VVOS Staging + Production setup

## Doel

Een eenvoudige en veilige straat:

`feature/* -> staging repo/main -> eigenaar akkoord -> afzonderlijke production repo -> handmatige rollout`

## Firebase-projecten

Gebruik twee volledig gescheiden Firebase-projecten:

- Volt & Vroom Staging: `voltvroom-staging`
- Volt & Vroom Production: afzonderlijk project, later in te richten

Gebruik geen productieklanten, echte leads of productie-secrets in staging.

## Git-branches

- staging-repository `main`: geaccepteerde stagingcode
- production-repository `main`: uitsluitend exact goedgekeurde releases
- `feature/*` en `agent/*`: wijzigingen door developers of agents

Bescherm beide `main`-branches: geen directe pushes, verplichte PR/CI en eigenaar-review.

## Firebase App Hosting

### Staging-backend

- Firebase-project: `voltvroom-staging`
- GitHub live branch: `main` van de staging-repository
- Automatic rollouts: AAN
- Firebase environment type: `Unspecified` zolang `Staging` niet beschikbaar is; nooit `Production`
- App root: repository root
- Regio: `europe-west4`
- Custom domain later: `staging.voltvroom.nl`

### Production-backend

- Firebase-project: afzonderlijk production-project
- GitHub source: afzonderlijke private productierepository
- Live branch: `main`
- Automatic rollouts: UIT
- Environment name: `production`
- App root: repository root
- Custom domain: `www.voltvroom.nl`

Production wordt alleen uitgerold nadat Mik de staging-versie expliciet heeft goedgekeurd. Gebruik exact de geaccepteerde commit.

## Inrichtingsstatus op 13 augustus 2026

- [x] Staging-repository private gemaakt.
- [x] `voltvroom-staging` op Blaze Free Trial.
- [x] Firebase Web App geregistreerd en publieke clientconfig vastgelegd.
- [x] Email/Password Authentication ingeschakeld.
- [x] Firestore en Storage in `europe-west4` gemaakt; rules en indexes gepubliceerd.
- [x] Vier runtime-secrets in Secret Manager aangemaakt.
- [x] PR #1 technisch gecontroleerd: mergeable, CI groen en geen reviewopmerkingen.
- [x] PR #1 na expliciete eigenaar-goedkeuring als commit `543586f87f532875b9c5af5a5e5cccd9b46064bd` naar staging `main` gemerged; post-merge CI groen.
- [ ] Firebase GitHub App installeren en toegang geven tot uitsluitend de private repository `mik-voltvroom/staging`.
- [ ] App Hosting-backend maken met live branch `main`, auto rollout AAN en repository root als app root.
- [ ] Runtime service identity minimaal toegang geven tot de vier runtime-secrets.
- [ ] Een eigenaaraccount aanmaken en server-side role claim `owner` instellen.
- [ ] Eerste rollout en health-, auth- en service-hook-smokechecks uitvoeren.
- [ ] Daarna pas `staging.voltvroom.nl` en DNS koppelen.

## Definition of Done staging

- `/api/health` geeft een gezonde status.
- Login/auth is ingeschakeld voor VVOS en een eigenaar kan inloggen.
- Publieke homepage laadt.
- Firestore/Storage staging zijn geïsoleerd.
- Geen Caroutlet e-mailadressen of oude merkcopy.
- Geen production-secrets aanwezig.
- CI is groen.

## Definition of Done production

- Exact dezelfde commit als goedgekeurd op staging.
- CI groen.
- Production readiness check groen met productie-secrets.
- Backup/rollbackprocedure bekend.
- Custom domain + HTTPS actief.
- Health check na rollout groen.
