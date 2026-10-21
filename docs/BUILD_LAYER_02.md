# VVOS Bouwlaag 02 — Operations

Deze bouwlaag voegt een operationeel prototype toe bovenop de publieke website.

## Direct bruikbaar in demo-modus
- voertuigen invoeren en wijzigen;
- foto-URL's beheren en hoofdfoto bepalen;
- directe kostprijs en brutomarge berekenen;
- publicatievalidatie en volledigheidsscore;
- voorraad filteren op status;
- salesleads door een Kanban-pipeline bewegen;
- lokale opslag in de browser.

## Productiekoppelingen die nog credentials vereisen
- Firestore CRUD als centrale datastore;
- Firebase Storage voor echte uploads;
- VWE/RDW import;
- Merchant API push en foutfeedback;
- gebruikersauthenticatie en role claims;
- WhatsApp/e-mail opvolging.

## Statusmodel voertuig
`draft -> photography -> review -> available -> reserved -> sold -> archived`

Een voertuig kan alleen via de UI worden gepubliceerd wanneer de validatielijst leeg is. De website-feed moet in productie daarnaast server-side dezelfde regels afdwingen.
