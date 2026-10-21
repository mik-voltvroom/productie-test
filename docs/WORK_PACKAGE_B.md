# VVOS Work Package B — Commercial Core

Date started: 2026-08-18

Canonical branch: `rc/consolidation-v1.3.0`

Status: in progress / not deployed / not merged

## Objective

Replace preview-only commercial flows with server-authorized, repository-backed and auditable state while migrating financial truth to integer eurocents.

## Slice B1 — Deals and delivery

Implemented in code:

- strict, unknown-field-rejecting deal-create schema;
- integer-cent inputs and server-calculated `totalCents`;
- atomic Firestore creation of a deal and five default delivery tasks;
- crypto-random deal/task/payment identifiers;
- no predictable production portal token on new deals;
- repository-backed deal list, detail and delivery overview;
- persisted deal and delivery-task status transitions;
- action-level permissions for deal creation, deal status, delivery writes and payment creation;
- server-only Firestore boundaries for deals, delivery tasks, payments, deal documents and finance applications;
- delivery readiness gate for registration, payment and checklist completion;
- local demo reads may still use sample data, but mutations fail closed instead of reporting fake persistence.

## Eurocent transition

New deal, warranty, payment and deal-finance values use `...Cents` integer fields. Existing Firestore documents with `...Eur` fields are normalized to cents when read, without modifying live data. A later controlled migration must backfill verified documents and remove the compatibility reader only after readback and rollback evidence exist.

The wider vehicle, workshop and finance models still contain euro-float fields. They remain explicit follow-up work and must not be described as migrated by this slice.

## Remaining B backlog

- persistent payment provider records with idempotency and verified webhooks;
- persistent documents and finance applications;
- hashed, expiring and revocable portal grants with minimized responses;
- integer-cent migration for vehicle costs, invoices, ledger, cashflow and workshop parts;
- emulator-backed repository and Firestore Rules tests;
- migration dry-run, readback, rollback and staging acceptance evidence.

## Safety boundary

This work changes repository code and Rules definitions only. It does not deploy Rules, migrate Firestore data, activate providers, modify credentials, merge PR #15 or deploy staging/production.

## Slice B2 — Accepted snapshot and vehicle reservation

Implemented in code:

- transition to `signed` creates a single immutable `dealSnapshots` record with a minimized customer, vehicle and commercial snapshot;
- date of birth is deliberately excluded from the accepted snapshot;
- the vehicle moves from `available` to `reserved` in the same Firestore transaction;
- a second deal cannot reserve the same vehicle after the transaction commits;
- cancellation releases only a reservation owned by that deal;
- `delivered` requires the vehicle to still be reserved by that deal and atomically changes it to `sold`;
- snapshot records deny direct Firestore client reads and writes;
- no live snapshot, reservation or data migration has been executed.

## Slice B3 — Firestore Rules emulator gate

Implemented in repository code and CI configuration:

- pinned Firebase Rules test tooling compatible with Firebase 12 and Node 22;
- isolated Firestore emulator project `vvos-rules-test`, with no live Firebase connection or Rules deployment;
- emulator tests for public inventory reads, staff reads, server-only Commercial Core collections and audit-log boundaries;
- direct client creation, mutation and deletion of `reserved` or `sold` vehicles is denied, including for owner/admin/sales roles;
- ordinary non-commercial inventory maintenance remains available to authorized inventory roles;
- the vehicle form no longer offers `reserved` or `sold` as manual transitions; those states remain deal-repository controlled;
- GitHub CI provisions Java 21 and runs the Rules emulator suite as an explicit quality gate.

Local execution of the emulator suite requires Java 21 or newer. The current Codex Windows runtime has no Java installation, so the authoritative emulator execution evidence for this slice is the clean GitHub Actions runner. No emulator configuration points to staging or production.

## Slice B4a — Vehicle eurocent boundary

Implemented in repository code, without touching live documents:

- vehicle retail price, monthly indication, annual saving and all direct vehicle-cost fields now use integer `...Cents` values;
- dashboard forms still accept and display euros, but convert at the UI boundary and never store floats;
- public inventory pages and the Merchant feed format cents back to euros only for presentation/export;
- Firestore and local-demo readers normalize legacy `...Eur` documents to the canonical cents model;
- mismatching dual-written euro/cents values fail closed instead of choosing one silently;
- ordinary vehicle writes remove legacy euro fields and Firestore Rules require non-negative integer cents;
- the migration planner produces document-specific dry-run `set`/`deletePaths`, readback-compatible output and an exact rollback patch;
- unit tests prove fractional legacy conversion, readback, rollback, conflict rejection and cents-only no-op behavior.

This slice does not execute the migration planner against Firebase. A controlled follow-up must export a backup, run the planner read-only, review conflict counts, apply bounded batches, verify readback and retain rollback patches before the compatibility reader can be removed.

## Slice B4b — Invoice, bank and ledger eurocent chain

Implemented in the preview-backed finance boundary:

- invoice lines, subtotal, VAT, total and paid values use integer cents;
- VAT is rounded per invoice line in cents before totals are aggregated;
- bank transactions use signed integer cents, while invoices and ledger entries remain non-negative;
- reconciliation compares integer cents and allows at most one cent rounding difference;
- dashboard, invoice, cashflow and management views convert to euros only for display;
- audit metadata and API responses expose `totalCents` and `differenceCents` instead of floats;
- compatibility normalizers convert legacy invoice, bank and ledger documents and reject conflicting dual writes;
- sample finance data and regression tests use the canonical cents contract.

These finance endpoints remain preview-backed and are not described as persisted. No invoice, bank transaction or ledger document was written or migrated in Firebase.

## Slice B5 — Mobilox-backed public inventory

Implemented in repository code and staging integration:

- Mobilox/Hexon is configured to send one explicitly selected vehicle to the authenticated staging webhook;
- the webhook validates and normalizes the XML mutation before writing integer-cent vehicle data to Firestore;
- Hexon v2.25 nested consumer prices, canonical `voertuignr` identifiers and the `E` electric fuel code are normalized explicitly; an omitted odometer is stored for review and never published;
- the public repository reads only `available` vehicles whose website publication channel is enabled and whose validation error list is empty;
- the homepage renders repository-backed vehicle cards and passes the same inventory into the contact form;
- vehicle detail pages use the same public repository boundary, preventing draft, review, archived, reserved or sold inventory from being exposed;
- missing images use the Volt & Vroom mark instead of fabricated vehicle photography;
- unavailable or malformed Firestore inventory degrades to the existing inventory placeholder and is logged server-side.

This slice does not merge to `main`, deploy production, loosen Firestore Rules or expose Mobilox credentials to the browser.
