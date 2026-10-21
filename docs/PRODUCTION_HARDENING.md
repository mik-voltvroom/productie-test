# VVOS Production Hardening — Consolidated RC v1.3.0

Status: consolidation candidate. Production promotion remains blocked until all P0 gates are green.

## Applied in this consolidated branch

- Website sprint and Social Video Engine remain intact as the functional baseline.
- CI runs fail-closed with Firebase data mode and required authentication.
- `brand:audit` is a mandatory quality gate.
- `.env.example` defaults to Firebase + authentication instead of demo mode.
- RC branches are covered by CI.
- Package version identifies this canonical consolidation candidate.

## P0 production gates

1. `npm ci` succeeds from a clean checkout on GitHub Actions.
2. Repository guard, agent audit and brand audit pass.
3. TypeScript typecheck passes.
4. Unit/integration tests pass.
5. Next.js production build passes.
6. Public production endpoints do not serve demo/sample-backed business data. Merchant feed and finance are explicit audit targets.
7. Public lead creation has abuse protection before public launch.
8. Firestore and Storage security rules are tested for anonymous users and every staff role.
9. Staging secrets are configured outside source and `npm run readiness` passes.
10. Staging smoke tests cover login, vehicle read, lead creation, Merchant output and critical dashboard routes.
11. Rollback is rehearsed before first production promotion.
12. External logo/signing uses only approved master artwork.
13. Only the exact SHA that passes staging acceptance may be promoted.

## Work Package A endpoint boundary status

- Public Merchant feed now refuses sample inventory in Firebase mode.
- Public RDW lookup now refuses its fabricated local fallback in Firebase mode.
- Public sample customer portal is disabled in Firebase mode.
- Payment creation and Merchant sync no longer report simulated external progress as successful or queued.
- Public Social Video routes are explicitly classified as public; their handlers still enforce allow-listed output/events and same-site event submissions.
- Authenticated sample-backed deals, workshop and finance endpoints remain production blockers and are inventoried in `docs/RELEASE_CONSOLIDATION.md`.

## Consolidation rule

The canonical release line is built in this order:

1. production hardening controls;
2. public website and design system;
3. Social Video Engine;
4. Commercial Core hardening;
5. real inventory integration;
6. acceptance and rollback rehearsal.

Older feature branches remain historical inputs and must not be promoted independently once their accepted changes are present in the canonical RC line.

## Brand authority

The latest Volt & Vroom Brandbook and VV Design System are authoritative. Paper White / Soft White remain dominant, Ice Blue is supportive, Electric Blue is functional only, Deep Ink is the primary CTA/identity color, Manrope is used for headings and Inter for body/UI/data. Legacy Caroutlet references and the old `AUTOMOTIVE` lockup are release blockers.
