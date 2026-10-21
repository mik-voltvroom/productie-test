# VVOS Bouwlaag 03 — Integrations & Automation

## Opgeleverd
- Firebase Authentication met sessiecookie en optionele dashboardbeveiliging;
- rolclaims voor owner, admin, sales, marketing en workshop;
- repository-laag die schakelt tussen demo-opslag en Firestore;
- Firebase Storage foto-upload met type- en groottelimiet;
- RDW adapterroute met veilige demo fallback;
- VWE webhook/import endpoint met secret-controle;
- integratiestatus-dashboard;
- Merchant synchronisatie-endpoint en bestaande XML-feed;
- cron endpoint voor inventarisvalidatie, Merchant refresh en stale-lead controle;
- Storage Security Rules;
- uitbreidbare providerconfiguratie via environment variables.

## Productie activeren
1. Vul Firebase client- en adminvariabelen in.
2. Zet `VVOS_DATA_MODE=firebase`.
3. Zet na het testen `VVOS_REQUIRE_AUTH=true`.
4. Voeg custom claim `role` toe aan medewerkersaccounts.
5. Deploy Firestore- en Storage Rules.
6. Vul RDW/VWE/Google providergegevens in.

## Bewuste begrenzing
De Google Merchant API-push is als transportadapter voorbereid, maar voert zonder OAuth/service-accountconfiguratie geen externe mutatie uit. De XML-feed blijft volledig bruikbaar.
