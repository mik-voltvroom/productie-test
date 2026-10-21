# VVOS — Volt & Vroom Operating System

VVOS is het geïntegreerde bedrijfsplatform van Volt & Vroom voor de publieke website, voorraad, CRM, sales, aflevering, werkplaats en finance.

## Repositoryrol

Dit is de **staging-codebase**. De actieve `apphosting.yaml` wijst uitsluitend naar staging. Production gebruikt een afzonderlijke private repository, een eigen Firebase-project en onafhankelijke secrets. Deze repository bevat bewust geen automatische production-deploy.

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
- Intern: `/dashboard/*` en interne API’s; bij `VVOS_REQUIRE_AUTH=true` is een geverifieerde sessie vereist.
- Service hooks: cron en VWE zijn zonder browsersessie bereikbaar, maar falen gesloten en vereisen hun eigen secret.

## Operations

- [Architectuur en staging→production-gaps](docs/operations/STAGING_ARCHITECTURE.md)
- [Deployment- en rollback-runbook](docs/operations/DEPLOYMENT_RUNBOOK.md)
- [Secret matrix](docs/operations/SECRET_MATRIX.md)
- [Production checklist](docs/operations/PRODUCTION_CHECKLIST.md)
- [Draaiboek openbare website livegang](docs/operations/PUBLIC_SITE_GO_LIVE.md)
- [Securitybeleid](SECURITY.md)

Versie: `1.0.0-rc.2-otap`.
