# VVOS architectuur

## Kern
- Next.js App Router voor publieke website, dashboard en API-routes.
- Firebase Authentication voor medewerkers en later klanten.
- Cloud Firestore als centrale bron voor voertuigen, leads, klanten, taken en audits.
- Cloud Storage voor originele en geoptimaliseerde voertuigfoto's.
- Cloud Functions/Cloud Run voor synchronisatie met VWE, Merchant API, e-mail en WhatsApp.

## Datastromen
1. Voertuig wordt aangemaakt of via VWE geïmporteerd.
2. Validaties controleren verplichte velden, prijs, kilometerstand en afbeeldingen.
3. Publicatiestatus activeert website, structured data en Merchant-feed.
4. Leads komen centraal in `leads` binnen en krijgen eigenaar, status en opvolgtaak.
5. Iedere mutatie wordt vastgelegd in `auditLogs`.

## Modules roadmap
- M1 website + voorraad + leads + feed
- M2 CRM + taken + WhatsApp/e-mail
- M3 werkplaats + garantie + afleverproces
- M4 AI-content, prijsadvies en lead scoring
- M5 klantportaal, abonnementen en datawarehouse
