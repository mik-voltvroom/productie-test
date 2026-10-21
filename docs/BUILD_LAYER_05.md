# VVOS Layer 05 — Deal & Delivery

Layer 05 turns an accepted quote into a controlled delivery process.

## Modules
- Deal creation and lifecycle
- Purchase agreement and document dossier
- Warranty package selection
- Finance application status
- Deposit and balance payments
- Registration status
- Delivery checklist by department
- Personal customer portal
- Delivery readiness gate

## Deal lifecycle
`draft → awaiting_signature → signed → payment_pending → paid → registration → preparation → ready → delivered`

A vehicle may only be delivered when payment is complete, registration is completed and every mandatory delivery task is marked done.

## Persistence and money contract

- New deals and their five default delivery tasks are written atomically through the server-side DealRepository.
- Deal and delivery collections deny direct Firestore client access; authorized API routes use Firebase Admin.
- New commercial values use integer eurocents (`...Cents`). Client-supplied totals are rejected; `totalCents` is calculated server-side.
- Legacy Firestore `...Eur` fields are normalized to cents on read for a controlled transition. New writes never create euro-float fields.
- Deal and delivery task status changes use explicit transition maps and are persisted before the UI reports success.
- The `delivered` transition requires completed registration, a fully paid cent balance and every delivery task marked done.
- The `signed` transition atomically creates an immutable accepted-deal snapshot and reserves the selected vehicle.
- Cancellation releases only the reservation owned by that deal; delivery atomically marks that reserved vehicle as sold.

## Safety
Payment and electronic-signature endpoints remain unavailable until provider credentials and provider-specific SDK implementations are tested. Never store identity documents or payment card data directly in Firestore.
