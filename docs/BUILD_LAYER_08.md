# VVOS Layer 08 — Productiestabilisatie

## Opgeleverd
- Centrale server-side RBAC-permissiematrix voor owner, admin, sales, marketing, workshop, finance en readonly.
- Herbruikbare API-autorisatie met cryptografische Firebase-sessionvalidatie.
- Auditlogging naar Firestore in productiemodus en begrensde demo-opslag in demo-modus.
- Metadata-redactie voor tokens, secrets, cookies en API-sleutels.
- Gehashte IP-registratie in plaats van opslag van ruwe IP-adressen.
- Integratie-healthchecks met timeout, latency en degraded-status.
- Auditdashboard en beveiligde audit-API.
- Beveiliging van finance-, deal-, payment-, communication-, workshop-, warranty- en Merchant-mutaties.

## Productieacties
1. Voeg Firestore-index voor `audit_logs.createdAt desc` toe indien Firebase hierom vraagt.
2. Vul `AUDIT_HASH_SALT` met een lang willekeurig geheim.
3. Configureer alleen expliciete provider-health-URL’s die veilig zonder gevoelige payload kunnen worden benaderd.
4. Zet `VVOS_REQUIRE_AUTH=true` pas aan nadat custom role claims op medewerkersaccounts staan.
5. Test iedere rol tegen alle mutatie-API’s.

## Beveiligingsmodel
Frontendverberging is nooit voldoende. Iedere gevoelige API valideert nu zelfstandig de Firebase session cookie en vereiste permissie. In demo-modus wordt een owner-agent gebruikt zodat lokale ontwikkeling zonder Firebase mogelijk blijft.
