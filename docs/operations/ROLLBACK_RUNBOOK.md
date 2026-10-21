# VVOS rollback runbook

## Wanneer rollback
- kritieke fout op publieke site;
- login/VVOS onbruikbaar;
- datacorruptierisico;
- foutieve publicatie naar externe kanalen;
- veiligheidsincident.

## Procedure
1. Stop verdere deployments.
2. Noteer huidige rollout + commit SHA.
3. Kies in Firebase App Hosting Production de laatste bekende stabiele rollout.
4. Roll back naar die release.
5. Controleer `/api/health`, login, voorraad en kritieke API's.
6. Maak een incident-issue in GitHub.
7. Fix uitsluitend via `feature/* -> staging -> main`.

Rollback is geen vervanging voor databaseherstel. Firestore-backups/exportbeleid moet apart worden ingericht zodra production bestaat.
