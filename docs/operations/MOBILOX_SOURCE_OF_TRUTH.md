# Mobilox als bron van openbare voorraad

Implementatie voorbereid op productie-archief `2987642039c302a8b15ec29c07f408ac9333c84b` (5 oktober 2026). Dit document vervangt voor voorraadpublicatie het oude, additieve model in `VVOS_PUBLICATION_CONTROL.md`.

## Datastroom en eigenaarschap

`Mobilox XML → parser → HTTPS-validatie → volledige voertuigvervanging in Firestore → publieke allowlist → website/feed`.

- De bestaande Basic Auth-webhook en de compatibiliteitsroute gebruiken dezelfde processor. Geen nieuwe provider of dependency.
- Een upsert wordt als volledig voertuigbericht verwerkt. Als een contentgroep (foto’s, advertentietekst of opties) ontbreekt terwijl het huidige dossier daarvoor gegevens bevat, weigeren import én herstelplanner de gehele mutatie. Bestaande gegevens en het eventlog blijven dan intact. Een expliciet leeg element geldt als bewust leeggemaakt; zonder foto’s wordt het voertuig niet gepubliceerd. Dit onderscheid beschermt tegen ontbrekende contentgroepen, maar bewijst niet dat overige optionele specificaties volledig zijn aangeleverd. Merk, model, bouwjaar, kilometerstand, prijs en aandrijving moeten geldig zijn. Een ontbrekende kilometerstand wordt niet meer nul. Verifieer met de actuele provider dat `change` volledige records bevat voordat dit live gaat; er wordt geen nieuw API-contract verondersteld.
- Foto’s gebruiken de directe, gevalideerde Mobilox-URLs en bronvolgorde. Oude Storage-kopieën, tombstones, handmatige foto’s en publieke selecties worden bij vervanging verwijderd. De bestaande bovengrens is 200 foto’s.
- De volledige advertentietekst wordt naar platte tekst geconverteerd. Blokken vanaf `Kenteken`, contactgegevens en disclaimers worden niet meer afgekapt. Alleen tekstvelden direct op het voertuig worden gebruikt; een omschrijving van een optie wordt nooit advertentietekst. HTML wordt niet als HTML gerenderd.
- Opties uit de bestaande groepen `accessoires`, `zoekaccessoires` en `opties` worden samengevoegd en genormaliseerd; alleen de nieuwe bronset blijft bestaan.
- Een ongeldige foto-URL of ongeldige verplichte brondata wijzigt geen voertuig of verwerkingsevent. Bij tijdelijke databasefouten blijft de transactie atomair. Verwijderberichten schakelen publicatie uit.
- Firestore-upserts vervangen het gehele document. Alleen `costs`, `commercial`, `createdAt`, `reservedDealId`, `reservedAt`, `soldDealId`, `soldAt` worden expliciet behouden. Nieuwe prijsinformatie wordt aan de bestaande prijshistorie toegevoegd. Andere legacy bronvelden verdwijnen ook wanneer nieuwe optionele waarden ontbreken.
- Een geaccepteerde deal blijft gereserveerd/verkocht. De bronstatus wordt afzonderlijk bijgehouden; bij annuleren wordt de actuele bronstatus hersteld. Providerverwijdering verbreekt geen geaccepteerde deal.
- Dubbele verwerking wordt alleen overgeslagen als de payload ook de huidige bronstaat is; een legitieme terugkeer A → B → A werkt.

## Overgang van bestaande voorraad

`source.contentVersion: 1` wordt uitsluitend geschreven na een gevalideerde volledige import/herstelactie. Tot die tijd blijft de bestaande publieke selectie alleen-lezen werken. Dit voorkomt dat voorheen interne legacyfoto’s door alleen een code-deployment ineens openbaar worden. Er is geen dashboardroute meer om die selectie of tekst te wijzigen. Na herimport hebben legacyselecties geen invloed meer.

Een code-deployment alleen herstelt dus geen bestaande voorraad. Controleer na herstel dat alle bedoelde voertuigen `contentVersion: 1` hebben. Niet-gematchte oude VWE/handmatige voertuigen moeten afzonderlijk worden geïdentificeerd; verwijder of koppel die niet op basis van een gok. De hersteltool accepteert uitsluitend dezelfde canonieke `hexon-<externalId>`-identiteit.

## Schrijfgrenzen

- VWE-import antwoordt altijd HTTP 410 en schrijft niets, ook met een vroeger geldig secret.
- Firestore-clientmutaties op `vehicles` zijn geheel gesloten. Authenticated staff-read blijft gelijk.
- Nieuwe interne PATCH-route: `/api/vvos/vehicles/[id]/internal`. Alleen owner/admin/sales; sessiecontrole, origincontrole, beperkte body, strikte schema’s en optimistische concurrentie.
- Toegestaan: kosten, inkoopbron/-datum, voorraadstartdatum, doelmarge, maximale statijd, view-/leadtellers. Prijs, specificaties, foto’s, tekst, opties, bronidentiteit, publicatiestatus, prijshistorie en definitieve verkoopprijs zijn niet schrijfbaar via deze route.
- Oude editorial-API blijft een expliciete afwijzing geven voor oude clients; de repository voert geen writes meer uit.
- Storage-clientuploads naar `vehicles/**` zijn gesloten. Bestaande publieke downloadlinks blijven tijdens de overgang bereikbaar. Er worden geen fysieke bestanden verwijderd. Overige Storage-paden zijn niet gewijzigd.
- Servermutaties van het bestaande dealproces blijven bestaan. Dit proces beheert de reservering/verkoop, niet de advertentie-inhoud.

## Specificaties en bewijs

De bestaande parsermappings blijven de basis. WLTP-bereik en kwartaalwegenbelasting bereiken nu ook de openbare projectie en pagina. `lib/vehicle/source-specifications.ts` centraliseert daarnaast de veldnamen die al in de legacyadapter `lib/public-vehicles.ts` stonden: motorvermogen, cilinderinhoud, deuren, zitplaatsen, massa, trekgewicht, snelheid, acceleratie, CO₂, elektrisch vermogen, laadvermogen, registratie, BTW/marge, APK, energielabel, hybridekenmerk en aansluiting. Snelladen blijft onbekend bij ontbrekende/onbekende bronwaarde; expliciet nee blijft nee.

Deze veldnamen zijn aangetroffen in repositorycode; er is tijdens deze implementatie geen actuele productiepayload geleverd die bevestigt welke de provider werkelijk vult. De UI toont alleen aangeleverde waarden en noemt onzekere context ‘aangeleverd’; bijvoorbeeld laadvermogen wordt niet zonder bewijs als AC of DC benoemd. Er worden geen extra eigenschappen, voertuigwaarden, praktijkschattingen of meetresultaten verzonnen. ‘Alle specificaties’ blijft begrensd tot deze ondersteunde mappings; onbekende XML-velden worden niet blind publiek gemaakt.

## Herstelprocedure (niet uitgevoerd op productie)

Gebruik Node 22+, `npm ci` met het ongewijzigde lockbestand en expliciet ingestelde Firebase Admin-omgeving. Bewaar XML’s, exports en herstelplannen buiten de repository. Elke XML moet een recente volledige aanlevering zijn voor precies één voertuig. De tool kan niet zelfstandig bewijzen dat een aangeleverd XML-bestand de nieuwste Mobilox-stand is.

1. Maak een gecontroleerde export/back-up van de voorraad. Verzamel verse Mobilox-XML voor de beoogde voertuigen. Begin met het probleemvoertuig en identificeer dit op externalId/kenteken; de opgegeven controleauto is de Range Rover Velar (hexon-56821730).
2. Voer eerst een offline dry-run uit met een JSON-object `{ "hexon-ID": <voertuigdocument> }`:

   ```sh
   node scripts/mobilox-repair.mjs --input /secure/mobilox-xml --snapshot /secure/vehicles.json --plan /secure/offline-plan.json
   ```

3. Maak met alleen de gekozen omgeving een actuele database-dry-run. `FIREBASE_ADMIN_PROJECT_ID` moet exact overeenkomen met `--project`. Gebruik het werkelijk gecontroleerde project-ID, niet het staging-ID uit de archiefconfiguratie:

   ```sh
   node scripts/mobilox-repair.mjs --input /secure/mobilox-xml --project ACTUAL_PROJECT_ID --plan /secure/live-plan.json
   ```

4. Beoordeel aantallen, gewijzigde veldnamen, identiteit en publicatiestatus. Het plan bevat hashes/aantallen/veldnamen, geen XML, tekst, foto-URLs of kostenbedragen. Een offline plan kan niet als productieplan worden toegepast.
5. Pas uitsluitend na expliciete productie-opdracht het beoordeelde plan toe:

   ```sh
   node scripts/mobilox-repair.mjs --input /secure/mobilox-xml --project ACTUAL_PROJECT_ID --plan /secure/live-plan.json --apply
   ```

6. Alle bestanden worden vooraf gevalideerd. Per voertuig wordt de actuele documenthash opnieuw in de transactie gecontroleerd. Een gewijzigde bron, gewijzigd dossier of afwijkende bestandenset stopt de actie. Reeds herstelde records geven `noop`. Bij een conflict kan een voorgaand voertuig al zijn verwerkt: stop, onderzoek en maak opnieuw een dry-run. Er is geen alles-of-niets-transactie over de volledige voorraad.
7. Iedere wijziging maakt in dezelfde transactie een server-only back-up in `inventoryRepairBackups` en een auditrecord. Bestaande Firestore-default-deny houdt deze back-ups buiten clienttoegang. Consolelogs bevatten alleen voertuig-ID, status en aantallen.
8. Controleer voor de Range Rover Velar én enkele andere voertuigen: payload → document → publieke pagina/feed; fotolijst/volgorde, volledige tekst, opties, specificaties, kenteken/prijs en reserveringsstatus. Herhaal de import om idempotentie te bevestigen. Controleer mobiele/tablet/desktopweergave en netwerkstatus van daadwerkelijke foto-URLs.

## Uitrol en rollback

Eerst lintconfiguratie beoordelen, clean install, tests, TypeScript, productiebuild, Firestore/Storage-regeltests en visuele controles in een geïsoleerde omgeving. Deploy code en bijbehorende regels gecoördineerd na expliciete toestemming. Oude clients krijgen bewust een fout op mutaties en moeten vernieuwen. In de bestaande `.firebaserc`, `firebase.json` en README staan stagingverwijzingen; deze zijn niet aangepast en mogen niet als bewijs van een productieproject worden gebruikt.

Bij rollback: stop nieuwe bronmutaties tijdens de gecontroleerde omschakeling, herstel de vorige code/regels alleen na beoordeling en gebruik de serverback-up als bewijs voor gericht dataherstel. Schrijf niet blind een oud heel voertuig terug over nieuwere kosten of dealmutaties. Herstel bij voorkeur uit een opnieuw bevestigde actuele Mobilox-aanlevering. De parserback-up en daadwerkelijke productie-/voertuigvalidatie moeten vóór livegang beschikbaar zijn.

## Aanvullende reparatie 7 oktober 2026

Accugezondheid en verbruik zijn aanvullende brongegevens en blokkeren publicatie niet langer. Ontbrekende waarden blijven afwezig; er wordt geen nul of meetresultaat verzonnen. Verplichte identiteit, prijs, foto en vestiging blijven gecontroleerd. Processorversie 6 past de bescherming tegen ontbrekende contentgroepen ook op opnieuw aangeboden berichten toe.

De CI-blokkade GHSA-68fv-2mgg-jv7q is opgelost door source-map-js in het lockbestand naar 1.2.2 bij te werken. De integriteit is opgehaald uit de npm-registry via GitHub CI en vastgelegd in het lockbestand. Geen nieuwe productiedependency of aanpassing van de beveiligingsaudit.

## Verwijderen uit de actieve VVOS-voorraad

De standaardweergave is Actieve voorraad. Een ontvangen Mobilox-delete haalt de auto uit die lijst en uit de actieve KPI’s; het dossier blijft via Archief / verwijderd in Mobilox of Alle dossiers inclusief historie toegankelijk. Bij een actieve deal blijft de lokale reserverings-/verkoopstatus behouden, maar source.inventoryStatus=archived sluit het voertuig toch uit van actieve voorraad. De lijst herlaadt bij terugkeer naar het tabblad en elke minuut zolang het tabblad zichtbaar is. Zonder ontvangen delete kan VVOS niet weten dat de bronauto verwijderd is.

## Rechtstreekse aanlevering vanuit Mobilox

Gebruik de bestaande Mobilox/Hexon Eigen Website Incrementeel-aanlevering:
- Ontvanger: `https://www.voltvroom.nl/api/hexon/inventory`.
- Methode: POST; Content-Type application/xml (text/xml wordt ook geaccepteerd).
- Basic Authentication: de productiegegevens die overeenkomen met runtime-secrets HEXON_SYNC_USERNAME en HEXON_SYNC_PASSWORD. Geen secretwaarden opnemen in documenten of chat.
- Succes: HTTP 200 met platte tekst `1`, pas na succesvolle databaseverwerking. Fouten worden niet als succes bevestigd.
- Verstuur zowel toevoegingen, wijzigingen als verwijderingen voor dezelfde bronidentifiers.

Dit is een push naar de bestaande serverontvanger, geen browserimport of periodieke volledige feeddownload. `/api/integrations/mobilox` is uitsluitend een compatibiliteitsroute naar dezelfde verwerking. De cronroute ontdubbelt dossiers en haalt geen voorraad uit Mobilox op. De VWE-import is beëindigd en wordt daarom niet meer als actieve koppeling getoond.

Activering van het verzenddoel en het opnieuw aanbieden van gemiste verwijderingen moeten in Mobilox of via de provider gebeuren. Repositorywijzigingen wijzigen die externe instellingen niet. Bevestig na uitrol één echte wijziging en één verwijdering in de importevents, het VVOS-dossier en de publieke website. Voer geen bulkverwijdering uit op basis van een onvolledige lijst.
