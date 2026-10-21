# VVOS — Volt & Vroom Operating System

VVOS is het geïntegreerde bedrijfsplatform van Volt & Vroom voor de publieke website, voorraad, CRM, sales, aflevering, werkplaats en finance.

## Repositoryrol

Dit is `mik-voltvroom/productie`. De actieve `apphosting.yaml` wijst naar `voltvroom-productie`. Staging heeft een afzonderlijke repository en Firebase-project. Gebruik expliciete projectnamen; een lokale build is geen deployment. Merge of publicatie vereist afzonderlijke toestemming.

## Lokaal starten

```bash
cp .env.example .env.local
npm ci
npm run dev
```

## Kwaliteitscontrole

```bash
npm run check
```

Deze gate controleert legacy merk-/secretsporen, repository-integriteit, TypeScript, regressietests en de production build.

## Routing

- Publiek: `/`, `/voorraad/*`, lead capture, merchant feed, healthcheck en tokenportaal.
- Intern: `/dashboard/*` en interne API’s vereisen een geverifieerde sessie. Alleen de expliciete combinatie `VVOS_ENV=local`, `VVOS_DATA_MODE=demo`, `VVOS_REQUIRE_AUTH=false` kan lokaal zonder sessie werken. Browserdemo vereist daarnaast `NEXT_PUBLIC_VVOS_ENV=local` en `NEXT_PUBLIC_VVOS_DATA_MODE=demo`.
- Service hooks: cron en VWE zijn zonder browsersessie bereikbaar, maar falen gesloten en vereisen hun eigen secret.

## Operations

- [Architectuur en staging→production-gaps](docs/operations/STAGING_ARCHITECTURE.md)
- [Deployment- en rollback-runbook](docs/operations/DEPLOYMENT_RUNBOOK.md)
- [Secret matrix](docs/operations/SECRET_MATRIX.md)
- [Production checklist](docs/operations/PRODUCTION_CHECKLIST.md)
- [Draaiboek openbare website livegang](docs/operations/PUBLIC_SITE_GO_LIVE.md)
- [Securitybeleid](SECURITY.md)

Versie: `1.0.0-rc.2-otap`.
