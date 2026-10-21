# VVOS secret matrix

Secrets worden nooit in `.env.example`, GitHub commits of prompts met echte waarden opgeslagen. Firebase clientconfig is publiek ontwerpgegeven en staat daarom als gewone stagingconfig in `apphosting.yaml`.

| Secret/config | Staging | Production | Opslag |
|---|---|---|---|
| Firebase client config | `voltvroom-staging` | eigen project | `apphosting.yaml` / Firebase system |
| Admin credentials | runtime service identity | eigen runtime identity | Application Default Credentials |
| `CRON_SECRET` | apart | apart | Secret Manager |
| `PORTAL_TOKEN_SECRET` | apart | apart | Secret Manager |
| `AUDIT_HASH_SALT` | apart | apart | Secret Manager |
| `VWE_WEBHOOK_SECRET` | sandbox/test | live | Secret Manager |
| `HEXON_SYNC_USERNAME` | uniek en willekeurig | onafhankelijk uniek | Secret Manager |
| `HEXON_SYNC_PASSWORD` | uniek, willekeurig en minimaal 24 tekens | onafhankelijk uniek | Secret Manager |
| RDW/API credentials | test waar mogelijk | live | Secret Manager |
| Google Merchant | test/uit | live | Secret Manager |
| WhatsApp | sandbox/test | live | Secret Manager |
| Email provider | test | live | Secret Manager |
| Payment provider | test mode | live mode | Secret Manager |

Een secret mag nooit tussen staging en production worden hergebruikt als daarmee echte side-effects mogelijk zijn.

## Firebase staging-status

De vier bestaande runtime-secrets in project `voltvroom-staging` zijn `CRON_SECRET`, `VWE_WEBHOOK_SECRET`, `PORTAL_TOKEN_SECRET` en `AUDIT_HASH_SALT`. Voor de Mobilox/Hexon-activatie moeten daarnaast `HEXON_SYNC_USERNAME` en `HEXON_SYNC_PASSWORD` worden aangemaakt. Koppel alle zes per secret aan de App Hosting runtime service identity met uitsluitend minimaal benodigde accessorrechten.

Firebase Admin gebruikt de runtime service identity via Application Default Credentials. Voeg alleen `FIREBASE_ADMIN_*` secrets toe wanneer die identity aantoonbaar niet volstaat; commit nooit een service-account JSON-bestand.
