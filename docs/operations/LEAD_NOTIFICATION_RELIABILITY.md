# Websiteleads en Google Chat

## Onderzoek 12 oktober 2026

Bron: productie `main`, commit `5ec8d4cf080fb9d704604253c83210c6a411f1ee`.

- `/api/leads` valideert, controleert rate limits en slaat eerst op in Firestore. Daarna volgt één Google Chat-verzoek met een time-out van vijf seconden.
- De versie vóór deze wijziging logt ontbrekende configuratie en webhookfouten, maar bewaart geen meldingsstatus voor medewerkers. De leadcockpit haalt bovendien alleen bij openen gegevens op.
- `apphosting.yaml` koppelt `GOOGLE_CHAT_WEBHOOK_URL` als runtime-secret. Dit bewijst de bedoelde configuratie, niet de aanwezigheid/toegangsrechten van het actieve secret of daadwerkelijke berichtontvangst.
- Tijdens deze controle was er geen gekoppelde Firebase-/Cloud Logging-toegang. Secretversie, runtime-IAM, actieve rollout en historische foutmeldingen konden niet worden geverifieerd. De GitHub-workflowlookup voor bovenstaande commit leverde geen runs op; dit zegt niets over Firebase-rollouts.
- Er is geen bewijs voor verloren aanvragen. Er zijn geen echte leads gelezen, testaanvragen in productie opgeslagen of live Chat-berichten verstuurd.

## Waarschuwingsvoorziening

Nieuwe aanvragen via `/api/leads` (contact, keuzehulp en financial lease) krijgen samen met de lead `notification.status=pending`. Na de verzendpoging wordt dit `sent`, `failed` of `not_configured`. Alleen provideracceptatie telt als `sent`; dat is geen leesbevestiging van een medewerker.

Faalt het vastleggen van het resultaat of stopt het proces na opslag, dan blijft `pending` staan. De lead blijft bewaard en de route retourneert na geslaagde opslag 201, ook bij een melding- of statusregistratiefout. Interne notificatiemetadata wordt niet in de publieke respons opgenomen. Logs bevatten uitsluitend vaste foutcodes/operaties, geen klantgegevens, providerresponse of webhook-URL.

De bestaande, afgeschermde leadcockpit toont waarschuwingen per lead en een waarschuwing boven nieuwe leads zonder bevestigde melding. Hij ververst elke 30 seconden en bij vensterfocus; ophaalfouten zijn zichtbaar. Een open cockpit is hiervoor nodig. Browsers kunnen achtergrondtimers vertragen. Dit is geen onafhankelijke push- of oproepdienst.

Oudere websiteleads zonder metadata krijgen **onbekend**, nooit een verzonnen succes- of foutstatus. Na opvolgen kan de medewerker de bestaande fase naar Contact zetten. Meldingshistorie blijft op de kaart zichtbaar. De client schrijft notificatiemetadata niet terug bij gewone leadwijzigingen.

Geen automatische webhook-retries: bij een time-out kan Chat het bericht al hebben ontvangen. Er worden geen extra leads aangemaakt voor herstel. Dit voegt geen algemene idempotentiesleutel toe voor losse, herhaalde HTTP-aanvragen of een verloren browserrespons. Inruil gebruikt een aparte route en valt buiten deze gerichte wijziging.

## Operationele verificatie vóór acceptatie

1. Controleer in Firebase App Hosting van `voltvroom-productie` de actieve rollout en runtime-secretbinding. Controleer dat een actieve secretversie bestaat en dat de runtime-identiteit deze mag lezen. Toon of kopieer de geheime URL niet naar logs, issues of deze documentatie.
2. Controleer dat de webhook naar de bedoelde besloten Google Chat-ruimte wijst en dat Mik/Don toegang en meldingen hebben.
3. Zoek in Cloud Logging naar `Lead notification incomplete` en `Lead notification status persistence failed`. Registreer alleen aantallen, tijdvak en vaste foutredenen; deel geen klantpayloads of secrets.
4. Test eerst in een geïsoleerde testomgeving met synthetische gegevens: ontbrekende webhook, HTTP-fout, netwerkfout/time-out en 2xx. Controleer één opgeslagen lead, 201, bijbehorende status en waarschuwing in VVOS. Test ook mislukte statusregistratie: de oorspronkelijke pending-status moet blijven bestaan. Opslagfout vóór notificatie moet 503 geven zonder Chat-verzoek.
5. Controleer de echte ontvangst met één herkenbare synthetische proefmelding zodra de eigenaar de operationele test autoriseert. Controleer ontvangst in de juiste ruimte én de lead in VVOS. Alleen een 2xx bewijst niet dat een medewerker is gewaarschuwd.
6. Bij een storing: volg nieuwe leads rechtstreeks in VVOS op, laat klanten niets opnieuw insturen, herstel de secret-/ruimteconfiguratie via het normale goedkeuringsproces. Stuur historische meldingen niet blind opnieuw.

## Impact en rollback

Additief veld op bestaande leaddocumenten, geen migratie, nieuwe collectie, index, secret of security-rulewijziging. Bestaande staff-autorisatie en Firestore-opslag blijven behouden. De extra statusupdate is best effort; het vooraf opgeslagen pending-veld is de waarschuwing als deze faalt. Periodiek verversen leest de bestaande leadlijst vaker; monitor leesvolume bij groei.

Rollback via revert van deze PR en een afzonderlijk goedgekeurde rollout. Bestaande leads blijven staan; oudere code negeert het extra veld. Geen merge of deploy tijdens dit onderzoek.
