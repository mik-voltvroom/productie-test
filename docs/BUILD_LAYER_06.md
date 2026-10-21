# VVOS Layer 06 — Workshop & Warranty

Layer 06 voegt de operationele aftersales-kern toe aan VVOS.

## Modules
- Werkplaatsplanning met statusbord
- Digitale werkorders
- Taken per monteur
- Hybride 360° inspectielijst
- Onderdelen en calculatie
- Urenregistratiemodel
- Klantakkoord voor meerwerk
- Garantieclaims en financiële exposure
- API-aansluitpunten voor werkorders en claims

## Routes
- `/dashboard/werkplaats`
- `/dashboard/werkorders/[id]`
- `/dashboard/garantie`
- `/api/workorders`
- `/api/warranty`

## Productiestap
De demonstratiedata staat in `lib/workshop/sample-data.ts`. Voor productie worden `work_orders`, `workshop_tasks`, `parts`, `time_entries`, `inspection_items` en `warranty_claims` Firestore-collecties. Voeg auditlogs, documentuploads, notificaties en leverancierkoppelingen toe voordat claims automatisch worden afgehandeld.
