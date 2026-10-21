# VVOS staging → production architectuur

## Huidige veilige grens

| Onderdeel | Staging | Production |
|---|---|---|
| GitHub | deze private repository, `main` via PR | afzonderlijke private repository |
| Firebase | project `voltvroom-staging`; App Hosting-backend `vvos-staging` in `europe-west4` | eigen project en handmatige backend-rollout |
| Config | actieve `apphosting.yaml` is staging-only | eigen actieve config; voorbeeld staat alleen onder docs |
| Secrets/data | sandbox/test, nooit echte klantdata | onafhankelijke live secrets en data |
| Rollout | automatisch na protected merge mag | handmatig na expliciete eigenaar-goedkeuring |

## Routinggrens

De middleware classificeert browser- en API-routes centraal. Publieke verkooproutes blijven bereikbaar; dashboard en interne API's vereisen een sessie. Cron en VWE zijn expliciete machinehooks en valideren hun eigen secret fail-closed. Handler-level autorisatie blijft de definitieve controle voor rollen en permissions.

## Nog niet production-ready

- Tokenportaal gebruikt nog demo/sampled data; vervang dit door ondertekende, intrekbare en aflopende tokens voordat echte klantdata wordt gebruikt.
- Publieke lead-, RDW- en portal-endpoints hebben nog geen rate limiting/WAF-beleid.
- Lead creation vereist nu een ingelogd staff-account. Activeer App Check pas nadat de webapp is uitgerold en getest; voortijdige enforcement kan staging blokkeren.
- Een eigen staging-domein/DNS en externe provideraccounts zijn nog niet ingericht. De standaard App Hosting-URL is wel actief.

## Geverifieerde Firebase-status (13 augustus 2026)

- Firebase-project bestaat: `voltvroom-staging` (projectnummer `241472991923`).
- Eigenaarstoegang voor `mik@voltvroom.nl` is aanwezig.
- Billing staat op Blaze Free Trial. Production is niet aangeraakt.
- Firebase Web App `VVOS Staging` is geregistreerd; de publieke clientconfig staat in `apphosting.yaml`.
- Email/Password Authentication is ingeschakeld. Er is nog geen eigenaaraccount of custom role claim aangemaakt.
- Firestore Standard en de default Storage-bucket staan in `europe-west4`.
- Firestore- en Storage Rules zijn gepubliceerd. De samengestelde indexes voor `vehicles` en `leads` zijn aangemaakt.
- `CRON_SECRET`, `VWE_WEBHOOK_SECRET`, `PORTAL_TOKEN_SECRET` en `AUDIT_HASH_SALT` bestaan in Secret Manager; hun waarden staan niet in git. `HEXON_SYNC_USERNAME` en `HEXON_SYNC_PASSWORD` zijn repo-backed geconfigureerd maar moeten voor activatie nog als onafhankelijke staging-secrets worden aangemaakt.
- Environment type blijft `Unspecified`: de Firebase-console bood alleen `Unspecified` en `Production`, niet `Staging`.
- PR #1 is na expliciete eigenaar-goedkeuring als commit `543586f87f532875b9c5af5a5e5cccd9b46064bd` naar staging `main` gemerged; de post-merge `quality`-check is geslaagd.
- App Hosting-backend `vvos-staging` is op 14 augustus 2026 aangemaakt in `europe-west4`, gekoppeld aan de bestaande staging Web App en uitgerold vanaf de geteste branch `agent/firebase-apphosting-source-deploy` (commit `e6960b16bf6e15d7a38797015df8efac454c360b`).
- De runtime service identity heeft alleen per-secret leesrechten op de vier runtime-secrets; er is geen projectbrede Secret Manager-rol toegekend.
- De standaard staging-URL is `https://vvos-staging--voltvroom-staging.europe-west4.hosted.app`.
- Smokechecks na de eerste rollout: homepage `200`, `/api/health` `200`, interne API zonder sessie `401`, VWE zonder secret `401` en cron zonder secret `401`.
- GitHub continuous deployment is nog niet gekoppeld. De eerste rollout is gecontroleerd vanaf lokale bron uitgevoerd; installeer de Firebase GitHub App later met toegang tot uitsluitend `mik-voltvroom/staging`.

## Promotieprincipe

Promotie is een overdracht van exact dezelfde geteste snapshot, niet een merge met aanvullende wijzigingen. De goedgekeurde staging-SHA, CI-uitkomst, smokechecks en rollback-SHA horen bij iedere release vastgelegd te worden.
