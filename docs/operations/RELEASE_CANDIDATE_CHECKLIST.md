# VVOS 1.0 Release Candidate Checklist

## Groen

- Repository-audit
- TypeScript
- Regressietests
- Lokale startup
- Homepage-smoketest
- Healthcheck
- Server-side RBAC-basis
- Auditlogging-basis
- Firestore-pad voor leads

## Voor staging verplicht

- Firebase emulator- of stagingproject invullen
- Rollen en custom claims testen
- Firestore en Storage Rules deployen en testen
- Providerwebhooks met idempotency testen
- Klantportaaltokens cryptografisch genereren en intrekken
- Back-up/hersteltest uitvoeren
- Build in CI of hostingomgeving volledig afronden

## Voor productie verplicht

- `npm run readiness` moet groen zijn
- Externe penetratie- en privacycheck
- Accountantscontrole
- Provider sandbox naar live omzetten
- Monitoring en alerts activeren
- Incidentprocedure en eigenaar aanwijzen
