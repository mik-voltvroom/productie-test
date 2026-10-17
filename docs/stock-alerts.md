# Persoonlijke voorraadalert — beheer en activering

## Status en omvang

Deze implementatie staat standaard uit. De PR activeert geen inschrijvingen, scheduler of e-maildienst. Er is geen nieuwe betaalde provider gekozen. De bestaande `lead-notification.ts` gebruikt Google Chat; `EMAIL_API_URL`/`EMAIL_API_KEY` waren alleen configuratiechecks, geen aantoonbaar bestaande e-mailintegratie. Daarom is een afgeschermde `gateway-v1`-adapter toegevoegd. Een operator moet vóór activering vaststellen dat de gekozen gateway dit contract werkelijk uitvoert.

Publieke routes: `/voorraadalert`, `/voorraadalert/bevestigen`, `/voorraadalert/beheren`, `/voorraadalert/uitschrijven`. De voorraadpagina biedt de CTA bij resultaten en lege resultaten, met overname van alle bestaande filters. Andere inventory-componentgebruikers blijven standaard zonder CTA. VVOS: `/dashboard/voorraadalerts`; daar staat ook een afgeschermde synthetische HTML/plain-textpreview.

## Vooraf te beoordelen instellingen

| Instelling | Voorgestelde productie-instelling |
|---|---|
| Publiek domein | `https://www.voltvroom.nl` |
| Afzender | Nog te kiezen en bij provider te verifiëren; geen adres automatisch ingesteld |
| Provider | Nog te verifiëren HTTPS-gateway; contract hieronder |
| Aanmeldingen / matching / verzending | Alle drie standaard `false`, afzonderlijk te schakelen |
| Dagoverzicht | Vanaf 09:00 `Europe/Amsterdam`, maximaal één digest per inschrijving/lokale dag |
| Aantal auto's | 5 per e-mail; instelbaar 1–10; overige matches blijven voor volgende dagen staan |
| Bevestiging | Binnen de volgende worker-run, maximaal twee aanvragen/mailbox/UTC-dag en vier uur tussen aanvragen |
| Algemene aanmeldlimiet | 60/UTC-uur en 500/UTC-dag, gedeeld via Firestore |
| Retries | Maximaal drie claims; alleen expliciet afgewezen, retrybare provideruitkomsten; 2 en 4 minuten backoff |
| Worker | Maximaal 40 seconden werkbudget; route maximaal 60 seconden; lease 120 seconden |
| Batch | 30 inschrijvingen, 20 matchkandidaten/inschrijving, 20 verzendopdrachten/run; maximaal 1.000 voorraadrecords |

De daglimiet betreft voorraadmails, niet gevraagde bevestigingsmails. 09:00 is het begin van verwerking; batchgrootte en provider bepalen de werkelijke aankomsttijd. Lege digests worden niet verstuurd. Niet voltooide/verlopen taken worden zichtbaar gehouden; onbekende provideruitkomsten worden nooit automatisch opnieuw verzonden.

Gebruik `.env.stock-alerts.example` uitsluitend als namenlijst. Zet echte waarden in de bestaande secret manager. Alle secrets minimaal 32 willekeurige tekens; gebruik verschillende waarden voor tokenafleiding, worker en webhook. `STOCK_ALERT_PREVIEW=true` werkt alleen bij `VVOS_ENV=local` en maakt de publieke formulierweergave zichtbaar terwijl verzending geblokkeerd blijft. De VVOS-mailpreview gebruikt uitsluitend vaste voorbeeldgegevens en verstuurt niets.

## Providercontract en afzender

`STOCK_ALERT_EMAIL_CONTRACT=gateway-v1` is een expliciete operatorverklaring, geen automatische detectie. De adapter POST naar een vaste `EMAIL_API_URL` met HTTPS, `Authorization: Bearer EMAIL_API_KEY`, `Idempotency-Key: <job-id>` en JSON `{from,to,subject,html,text,reference}`. Redirects zijn verboden; timeout tien seconden; response maximaal 64 KiB.

Geaccepteerd: succesvolle HTTP-status met `{accepted:true,messageId:"provider-reference"}`. Expliciet afgewezen: niet-succesvolle HTTP-status met `{accepted:false,retryable:true|false}`. Een generieke 429/500, timeout, ontbrekende messageId of onleesbaar antwoord is **onbekend**, tenzij het contract aantoonbaar een expliciete afwijzing geeft. Een door de provider geaccepteerd bericht is niet automatisch afgeleverd.

Verifieer afzenderdomein, SPF/DKIM/DMARC, reply-routing, verwerkersafspraken, providerlimieten, bewaartermijnen, eventreferenties en idempotentie vóór activering. De gateway moet dezelfde reference/idempotency-key behouden en een herhaalde expliciet afgewezen opdracht veilig ondersteunen. Er is geen exactly-once-garantie over Firestore en een externe provider. Een crash na provideracceptatie maar vóór lokale opslag krijgt na leaseverloop `failed/outcome=unknown`; de reeds gereserveerde voertuigidentiteiten verhinderen ook een nieuwe melding op latere dagen. Onderzoek dit bij de provider; een ondertekende callback kan de status herstellen. Geen blinde handmatige retry voor onbekende of al geaccepteerde opdrachten.

Optionele callbacks: POST `/api/stock-alerts/webhook`, body exact `{id,jobId,messageId,type}` met type `accepted`, `delivered`, `bounced` of `unsubscribed`. `x-stock-alert-timestamp` is Unix-seconden; `x-stock-alert-signature` is hex HMAC-SHA256 van `<timestamp>.<ongewijzigde-body>` met `STOCK_ALERT_WEBHOOK_SECRET`. Maximaal vijf minuten klokafwijking. Event-id wordt 90 dagen gededupliceerd. Job moet al dispatchStartedAt hebben; een bekende messageId moet overeenkomen. Signed unsubscribed/bounced schakelt de inschrijving uit. Zonder callbacks toont VVOS alleen aantoonbare provideracceptatie en geen verzonnen afleverstatus.

Digest bevat persoonlijke beheer- en uitschrijflinks. GET voert niets uit; expliciete POST-bevestiging voorkomt scanneractivering. Deze versie adverteert geen RFC 8058/List-Unsubscribe-Post: die vereist een afzonderlijk aantoonbaar compatibele providerimplementatie. Een provider mag zijn echte unsubscribe-event via de ondertekende callback doorgeven.

## Scheduler en indexen

Maak na aparte toestemming twee Cloud Scheduler HTTP POST-jobs aan op de **productie-origin** `/api/stock-alerts/worker`: een dagelijkse `0 9 * * *` en een periodieke `*/5 * * * *`, beide tijdzone `Europe/Amsterdam`. Header `Authorization: Bearer <STOCK_ALERT_WORKER_SECRET>` uit afgeschermde configuratie, geen queryparameters. Body `{}`. Timeout maximaal 60 seconden, begrensde Scheduler-retries; de worker dedupliceert opdrachten en leases voorkomen dubbele dispatch bij overlappende runs. Plan capaciteit voordat batchgrenzen worden verhoogd. OIDC alleen volstaat niet voor deze route: deze versie valideert specifiek het worker-bearergeheim.

De periodieke run verwerkt bevestigingsmails, inhaalmatches, retries en opschoning, ook wanneer een Mobilox-signaal ontbreekt. De import schrijft alleen bij ingeschakelde matching een klein reconciliatiesignaal; import/publicatie wacht nooit op e-mail. Geen tweede voertuigimport en geen wijzigingen in Mobilox-bronvelden. Er is bewust geen publiek 'cron'-GET-endpoint.

Voeg de vijf indexen uit `firestore.indexes.json` toe en wacht tot ze gereed zijn: jobs `(state,dueAt)`, jobs `(subscriptionId,createdAt desc)`, candidates `(subscriptionId,state,revision)`, subscriptions `(status,validUntil)`, subscriptions `(status,expiresAt)`. Er is geen datamigratie voor bestaande voertuigen. Nieuwe collecties beginnen leeg. Publiceer de aanvullende server-only rules samen met de release; alle bestaande roltoegang blijft ongewijzigd. Gebruik uitsluitend de bestaande gecontroleerde productie-deployprocedure, geen staging-project of brede rulesaanpassing.

## Toestemming, tokens en toegang

Specifiek, niet vooraf aangevinkt consent met tekstversie `stock-alert-2026-10-17-v1`, tekst en aanvraagmoment wordt bewaard. Alleen expliciete POST op de confirm-token activeert de inschrijving. Een heraanvraag overschrijft de bevestigde criteria en het bevestigde toestemmingsbewijs pas na nieuwe DOI. E-mailadres wijzigen vraagt DOI op het nieuwe adres; de bestaande alert blijft actief tot die bevestiging en wordt dan gestopt. Beheerlinks zijn eenmalig en roteren bij opslaan. Een wijziging van zoekwensen vernieuwt de toestemmingstermijn niet.

Elke token heeft een willekeurige 256-bit nonce en een doelgebonden HMAC-afleiding. Alleen tokenhash plus een niet-bearer nonce staat in opslag; de nonce is zonder servergeheim geen bruikbare token. Ruwe tokens bestaan alleen tijdens e-mailrendering of in clientgeheugen. De client verwijdert de URL-fragmenttoken onmiddellijk uit de adresbalk; er zijn geen tokens in querystrings, analytics, logs of browseropslag. Een reload van de opgeschoonde link vraagt opnieuw openen vanuit de e-mail. Beheerlinks zijn geldig 30 dagen, bevestiging 48 uur, uitschrijven 365 dagen. Een verse digest levert nieuwe links; bij verlopen beheerlink kan opnieuw DOI worden aangevraagd via het publieke formulier.

`STOCK_ALERT_TOKEN_SECRET` bepaalt ook gepseudonimiseerde mailbox-ID's. **Niet blind roteren**: normale individuele tokenrotatie gebeurt bij beheer. Voor globale sleutelrotatie eerst signups/matching/sending uit, dispatches laten uitlopen en incident beoordelen. Ofwel gecontroleerde server-side migratie met oude/nieuwe sleutel ontwerpen, ofwel de alertgegevens volgens de retentieprocedure wissen en nieuwe DOI vereisen. Er is geen stilzwijgende backwards-key-fallback. Worker/webhooksecrets kunnen afzonderlijk gecoördineerd worden vervangen.

POST vereist dezelfde canonical origin voor publieke en browserbeheeracties. JSON wordt al tijdens streamlezen op 16 KiB begrensd. Honeypot en gedeelde globale/mailboxquota remmen signupspam; er wordt geen onbetrouwbare x-forwarded-for-identiteit gebruikt. Bevestigingsherverzending gebruikt dezelfde quota. Er is geen IP-gebaseerde individuele limiet: een aanvaller kan de globale quota opgebruiken; monitor 503's en bied zo nodig gecontroleerde edgebescherming. Bezit van een doelgebonden token is de publieke autorisatie; de onvoorspelbare tokenruimte voorkomt raden, maar vervangt geen algemene hosting-DDoS-bescherming.

Alle tien `stockAlert*`-collecties zijn voor Firebase-clients volledig afgesloten, inclusief owner/admin. VVOS leest en schrijft via serverautorisatie: owner/admin/sales lezen en beheren; marketing leest; andere rollen hebben geen toegang. Stoppen verhoogt de revisie; queue en dispatch controleren status en revisie opnieuw. Een al aan de externe provider overgedragen bericht kan na uitschrijven nog aankomen. De laatste publieke voorraaduitlezing gebeurt direct vóór voorbereiding; een externe verkoop precies ná de dispatchgrens is niet atomair terug te trekken.

## Matching en rapportage

Carrosserie staat achter Meer wensen en gebruikt het al bestaande publieke `Vehicle.bodyStyle`, gevuld uit Mobilox `carrosserie`/`carrosserievorm`. Suggesties komen uit het huidige publieke aanbod; vrije invoer ondersteunt toekomstige voorraad. De vergelijking is exact na dezelfde labelnormalisatie. `Onbekend`, `unknown` en ontbrekende bronwaarden leveren geen carrosseriematch op. Er is geen afleiding uit foto's of modelnamen.

Alleen de bestaande canonieke publieke voorraadrepository, met de bestaande ontdubbeling, publicatievalidatie, publieke foto en beschikbare status. Geen gereserveerde/verkochte/ingetrokken/alleen-interne voertuigen. Merken/modellen zijn exact na Unicode/case/witruimtenormalisatie; geen fuzzy matching. Aandrijving, jaar, kilometerstand en aanschafprijs moeten aantoonbaar voldoen. Ontbrekende vereiste feiten sluiten een match uit. Leaseprijzen tellen niet mee. Nieuwe voorraad, opnieuw publiek gemaakte voorraad en prijswijzigingen worden periodiek opnieuw beoordeeld. Reeds aanwezige passende voorraad doet na DOI mee. Een voertuig dat al gemeld is wordt niet opnieuw gemeld na criteria-, slug-, foto- of importwijziging. Dit geldt ook bij nieuw bron-ID met dezelfde beschikbare VIN of genormaliseerde kentekenidentiteit.

Ledger wordt vóór providerdispatch transactioneel gereserveerd voor voertuig-ID én beschikbare VIN/kentekenidentiteiten. Geen gelijktijdige tweede reservering voor dezelfde identiteit/inschrijving. Ontbrekende VIN/kenteken betekent dat bron-ID de enige beschikbare identiteit is; een gewijzigd bron-ID zonder gedeelde identiteit kan niet betrouwbaar worden herkend. Er worden geen onbekende voertuigidentiteiten verzonnen.

VVOS toont echte totalen voor geldige actieve/onbevestigde inschrijvingen en aanmeldingen over zeven dagen. Inkoopsegmenten en vraag zonder match gebruiken maximaal 500 geldige actieve zoekwensen en vermelden deze steekproef; geen claim over unieke kopers, koopintentie of verkopen. Eén genormaliseerd e-mailadres heeft één actuele inschrijving. Overzicht heeft paginering van 50; historie maximaal 20 verzendopdrachten/50 kandidaten per inschrijving. Alleen definitief afgewezen, nog geschikte opdrachten kunnen veilig opnieuw worden geprobeerd; onbekende uitkomsten blijven geblokkeerd. Een digestdag die al is verzonden wordt na wensenwijziging niet opnieuw verzonden. Een nog niet geclaimde/verzonden opdracht kan met verse criteria worden vervangen; een reeds geclaimde oude revisie wordt onderdrukt en volgende verwerking maakt de passende opdracht.

Publieke events gebruiken bestaande consentregels: formulier geopend, aanvraag verzonden, DOI bevestigd en voertuig vanuit alert bekeken. Alleen gewhiteliste eventnamen, geen e-mailadres, token, criteria of individuele inschrijvings-ID. Persoonlijke tokenroutes en het alertbeheer laden geen GTM/analytics/merchantwidgets; tokenroutes hebben bovendien een self-only CSP/no-referrer/no-store/noindex. DOI-event volgt pas op een schone publieke URL met een functionele eenmalige boolean in sessionStorage. Voertuiglinks hebben de afgesproken drie UTM-parameters. De bestaande proefrit-/leadflow bewaart deze herkomst niet aantoonbaar; daarom worden geen toegeschreven aanvragen, proefritten of verkopen gerapporteerd.

## Bewaring en privacytekst

De privacyparagraaf op `/privacy#voorraadalert` is een voorstel bij deze PR. Controleer vóór publicatie de werkelijke verwerker, doorgiften, rechtenafhandeling en contactprocedure tegen de gekozen provider en bestaande bedrijfsafspraken.

| Gegevens | Bewaring/opschoning |
|---|---|
| Onbevestigd adres + wensen | 48 uur |
| Actieve toestemming | Maximaal één jaar na DOI; daarna verlopen, contactgegevens nog 30 dagen |
| Uitgeschreven/vervangen adres | 30 dagen |
| Bounce-suppressie | 180 dagen, voorkomt directe heraanmelding |
| Tokens | Tot doelgebonden verloop; gebruikte token blijft tot dat moment voor replayblokkade |
| Jobs / pogingen / audit / webhook-dedup | 90 dagen; bevestigingsjob 48 uur |
| Meldingsledger | 395 dagen, gepseudonimiseerde verwijzingen |
| Kandidaten | Tot de bewaartermijn van de gekoppelde inschrijving |
| Rate-limitrecords | Twee dagen |

Opschoning verwijdert begrensd maximaal 30 verlopen records per collectie/run en laat actieve toestemming verlopen. Laat de afgeschermde periodieke worker ook bij uitgeschakelde featureflags draaien voor retentie. Monitor achterstanden bij veel records. Contactgegevens staan alleen in subscriptions; overige records bevatten gepseudonimiseerde IDs. Een rechtmatig verwijderverzoek moet alle gekoppelde servercollecties en providergegevens meenemen, met afweging van noodzakelijke suppressie/bewijs. Dat proces wordt niet als onbeschermde browserknop toegevoegd.

## Veilige ingebruikname, monitoring en rollback

1. Merge/deploy pas na afzonderlijke toestemming. Houd alle drie switches uit. Deploy indexen/rules en controleer serverautorisatie en private headers.
2. Verifieer gatewaycontract, afzenderdomein, privacy/verwerker, callbackauthenticiteit en bewaartermijnen. Configureer secrets zonder waarden in tickets/logs. Test een door de operator aangewezen eigen testmailbox pas na aparte verzendtoestemming.
3. Maak scheduler met exacte bovenstaande URL, headers, timezone en grenzen; controleer succesvolle cleanup-run. Zet matching aan met verzending uit en inspecteer alleen synthetische/expliciet goedgekeurde proefdata. Geen bestaande leads importeren als toestemming.
4. Beoordeel bovenstaande afzender/planning/limieten concreet met de operator. Zet verzending pas na die controle aan; publieke signups worden alleen beschikbaar als alle drie flags én verplichte configuratie geldig zijn.
5. Monitor `lastSuccessfulRun`, queue/failed, provideracceptatie versus echte callbacks, globale quota, bounces, suppressies en cleanupachterstand. Waarschuw extern bij opeenvolgende scheduler-503's of geen succesvolle run in 15 minuten. De module toont toestand maar maakt zelf geen nieuw extern monitoringaccount aan.
6. Rollback: zet eerst signups en sending uit, daarna matching indien nodig. Laat cleanup draaien. Wacht minstens de 120-secondenlease + providertimeout voor beoordeling van in-flight werk. Niet blind queue/ledger wissen: dat kan dubbele meldingen veroorzaken. Geen oude appversie heractiveren met flags aan. Behoud server-only rules en ledger totdat de bewaartermijn/incidentafhandeling dat toelaat.

## Validatie en grenzen

Unit-/HTTP-tests gebruiken nep-mailer/fetch, emulator uitsluitend `vvos-rules-test` op localhost. Scenario's omvatten DOI/scanners/replay, matching en ontbrekende feiten, budgetintrede, identiteit, verkoop tussen match/send, uitschrijven, meerdere workers, leasefencing, providercrash en callbackherstel, e-mailwijziging, consentbehoud, daglimiet en beide DST-overgangen. Rules worden met anonieme en alle bestaande rollen getest. Browser-QA gebruikt alleen lokale synthetische gegevens; geen echte e-mail of providerrequest.

Productieachtige build en QA zijn geen bewijs van echte e-mailaflevering, mailboxclientcompatibiliteit of een aangemaakte scheduler. De lokale browserpreview controleert HTML en responsive weergave; Outlook/Gmail/Apple Mail-verzendtests volgen pas na provider- en verzendgoedkeuring. Op >1.000 openbare voertuigen stopt de worker expliciet; schaal eerst het batchontwerp. Er is geen nieuwe productieafhankelijkheid toegevoegd.

## Integratie met lopend werk

Gebaseerd op `main` `12fddfc75c31f97b8a166f9ee6d31650b4486da4`, inclusief het samengevoegde Search Console-paneel uit PR #109. De voorraadalert wijzigt geen Search Console-bestanden. Bij latere merges gericht controleren: PR #82 raakt GTM/consent; #93 raakt InventoryBrowser, indexen/rules, permissies, routing en Mobilox-integratie; #95 raakt rules, permissies en de publieke voorraadrepository. Deze open PR's zijn alleen gelezen, niet gewijzigd of mee samengevoegd. PR #81 beheert de afzonderlijke ESLint-inrichting; de bestaande `npm run lint` opent zonder die configuratie een installatiewizard en is geen geslaagde lintcontrole. Bestaande Autoprefixer-waarschuwingen vallen buiten deze functionele wijziging.
