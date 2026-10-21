# VVOS Bouwlaag 04 — Sales Automation & Customer Journey

## Doel
Laag 04 verandert losse leads in een bestuurbare commerciële workflow. De laag prioriteert koopintentie, bewaakt reactiesnelheid en brengt activiteiten, afspraken, offertes en inruil samen in één klantbeeld.

## Modules
- Automatische leadscore 0–100 met cold/warm/hot-classificatie
- Responstermijn op basis van koopintentie
- Lead cockpit met zes verkoopfasen
- 360° leaddossier en activiteitentijdlijn
- Proefritten, showroomafspraken, videogesprekken en aflevering
- Offertes met afleverpakket, korting en inruilcredit
- Inruildossiers
- Configureerbare follow-upregels
- E-mail- en WhatsApp-provideradapters met veilige previewmodus

## Principes
1. Menselijke verkoper blijft eigenaar van de relatie.
2. Automatisering bevestigt, herinnert en prioriteert; zij doet geen misleidende toezeggingen.
3. Externe berichten worden zonder geldige providerconfiguratie niet verzonden.
4. Leadscore is uitlegbaar via zichtbare redenen.
5. Privacytoestemming beïnvloedt marketingopvolging en score.

## Routes
- `/dashboard/leads`
- `/dashboard/leads/[id]`
- `/dashboard/afspraken`
- `/dashboard/offertes`
- `/dashboard/automatisering`
- `POST /api/sales/score`
- `POST /api/communications/send`

## Productiestappen
- Firestore repositories toevoegen voor activities, appointments, quotes, trade_ins en automation_rules.
- E-mailprovider kiezen en sandbox testen.
- WhatsApp Business Cloud API koppelen en templates laten goedkeuren.
- Medewerkers en lead routing configureren.
- Agenda-integratie toevoegen.
- AVG bewaartermijnen en verwijderworkflow activeren.
