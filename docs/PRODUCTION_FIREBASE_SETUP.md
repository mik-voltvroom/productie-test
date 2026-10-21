# Volt & Vroom — Step 3: Production Firebase / App Hosting

Status: in progress
Release branch: `release/production-2026-08-21`

## Goal
Create a dedicated production Firebase/App Hosting environment that cannot accidentally use the staging project, data, bucket or secrets.

## Current verified state
- Repository `.firebaserc` points only to `voltvroom-staging`.
- Existing `apphosting.yaml` is staging-only.
- No production Firebase project id is present in the repository.

## Production setup checklist
1. Create or identify the dedicated production Firebase project.
2. Enable Firestore, Authentication, Storage and App Hosting in that production project.
3. Create the production Firebase Web App and collect its public web config values.
4. Create a dedicated production App Hosting backend linked to the release/production source strategy.
5. Configure `VVOS_ENV=production`, `VVOS_DATA_MODE=firebase`, `VVOS_REQUIRE_AUTH=true` and `NEXT_PUBLIC_SITE_URL=https://www.voltvroom.nl`.
6. Add production Secret Manager values for `CRON_SECRET`, `VWE_WEBHOOK_SECRET`, `HEXON_SYNC_USERNAME`, `HEXON_SYNC_PASSWORD`, `PORTAL_TOKEN_SECRET` and `AUDIT_HASH_SALT`.
7. Configure the production Storage bucket and verify the App Hosting runtime identity can create objects in the vehicle image path.
8. Deploy Firestore rules and indexes to production only after project identity has been verified.
9. Run production readiness checks before connecting the public domain.

## Guardrails
- Never reuse `voltvroom-staging` as the production project.
- Never copy secret values into Git.
- Never replace the staging `apphosting.yaml` with production values on `main` before the production backend/project identity is explicit.
- Keep staging and production buckets separated.
- Do not connect `www.voltvroom.nl` until the temporary production App Hosting URL passes smoke tests.

## Repository artifact
`apphosting.production.yaml.example` contains the production template. Replace only the explicit `REPLACE_WITH_PRODUCTION_*` placeholders with values from the dedicated production Firebase Web App.

## Blocking input
The production Firebase project id is intentionally not guessed. Once the actual project has been created or identified, add a `production` alias to `.firebaserc` and complete the production App Hosting configuration.
