# Security Policy

## Productie-eisen
- Firebase Authentication met session cookies.
- MFA voor owner, admin en finance.
- Role-based access control op routes en API-mutaties.
- Firestore- en Storage Rules eerst testen met emulators.
- Cryptografisch sterke, intrekbare en verlopende portaaltokens.
- Webhooks beveiligen met signatures of gedeelde secrets en idempotency.
- Secrets uitsluitend via environment variables of Secret Manager.

## Kwetsbaarheid melden
Meld beveiligingsproblemen privé bij `mik@voltvroom.nl`. Publiceer geen klantdata, tokens of exploitdetails.
