# VVOS publicatieregie

Mobilox importeert brongegevens. VVOS bepaalt fotovolgorde, actieve foto's,
publicatieselecties en websitetekst. De website leest de bestaande publieke
repositoryprojectie; geen nieuwe database of parallelle feed.

## Aangepaste onderdelen

- `components/dashboard/VehicleForm.tsx`: aansluiting, foutmeldingen en bescherming van niet-opgeslagen formuliervelden.
- `components/dashboard/VehicleEditorialPanel.tsx` en `.module.css`: compact raster, pointer-drag, verplaatsknoppen, upload, selectie, opties en tekst.
- `types/index.ts`, `lib/vehicle/editorial.ts`, `lib/vehicle/photos.ts`: additief model, migratie, merge en publicatiefilters.
- `lib/integrations/hexon.ts`, `hexon-images.ts`, `hexon-service.ts`: import, veilige Mobilox-fotoreferenties en transactiemerge.
- `lib/repositories/vehicle-repository.ts`, `vehicle-editorial-repository.ts`: bestaande clientopslag en servertransacties.
- `app/api/vvos/vehicles/[id]/editorial/route.ts`: geautoriseerde, gevalideerde beheeropdrachten.
- `lib/repositories/public-vehicle-repository.ts`, `lib/public-vehicles.ts`: beide bestaande publieke projecties.
- `app/voorraad/[slug]/page.tsx`: VVOS-tekst zonder oude tekstvervanging, met behoud van alinea's. De beheer-API ververst de detailpagina na opslaan.
- `firestore.rules` en relevante tests: brondata afschermen en editorial-writes uitsluitend server-side.

## Uitgevoerde lokale controles

165 unit-/API-tests geslaagd met de vastgelegde Vitest 5.0.1-versie; TypeScript,
Next-productiebuild en repository-/agent-/merkcontroles geslaagd. De build meldt
bestaande CSS-waarschuwingen in frontend-refresh.css en social-video.css.
Browsercontrole met 50 lokale testfoto's: pointer-drag van foto 15 naar positie 1,
automatisch opslaan en opnieuw laden, optie zoeken/selecteren, websitetekst opslaan.
Desktop 1440px, tablet 820px en mobiel 390px visueel gecontroleerd; mobiele
horizontale overloop gecorrigeerd. De tijdelijke lokale testpagina is verwijderd.
De vijf Firestore-emulatortests zijn in de bestaande CI geslaagd; lokaal is geen
Java-runtime beschikbaar. Uploads naar echte Storage en een live Mobilox-payload
zijn niet tijdens deze lokale browsertest verzonden.

## Model en migratie

`vehicles/{id}.editorial` bevat versie 1, een revisienummer, geordende foto's
(ID, URL, bron, optionele bron-URL/contenthash, importtijd en deletedAt),
gepubliceerde genormaliseerde optiesleutels en afzonderlijke bronteksten plus
een optionele VVOS-websitetekst. `images` blijft de compatibele actieve volgorde.
`highlights` blijft de volledige optielijst; publicaties filteren op de selectie.

De migratie is lui en additief: de eerste sync of beheeractie maakt editorial
aan uit de bestaande arrays, publicatieselectie en tekst. Bestaande publicatie
blijft behouden. Er is geen destructieve batchmigratie. Records zonder editorial
blijven leesbaar. Bestaande tekst blijft als website-override bewaard omdat
achteraf niet betrouwbaar bekend is of die handmatig is aangepast.

## Import

- Maximaal 200 bronfoto's per payload, ook in de XML-parser.
- Mobilox blijft bron en host van geïmporteerde foto's. VVOS bewaart alleen de
  gevalideerde HTTPS-URL; de toegestane host staat expliciet op de allowlist.
- De genormaliseerde bron-URL vormt de stabiele foto-identiteit. Bij dezelfde
  URL blijft een handmatige tombstone behouden.
- De transactiemerge behoudt volgorde en ontbrekende foto's. Nieuwe foto's komen
  achteraan en blijven bij bestaande voertuigen intern.
- Verwijderingen zijn tombstones. De sync behoudt deze zolang Mobilox dezelfde
  foto-URL gebruikt.
- Nieuwe opties verschijnen ongeselecteerd; selecties blijven behouden.
- Herhaalde geslaagde events worden overgeslagen. Events met ongeldige foto-URL's
  kunnen opnieuw worden aangeboden; al bekende foto's worden dan hergebruikt.
- Een complete voertuig-delete vanuit Mobilox blijft het voertuig archiveren;
  dat is iets anders dan een verdwenen foto in een upsert.

## Tekstvelden: bewijslimiet

De bestaande actieve Hexon-parser gebruikte `opmerkingen`, met `omschrijving`
als fallback, en kortte de websiteweergave in tot de introductie. Repositorytests
bevatten `opmerkingen`; er is geen live payload gecontroleerd die twee afzonderlijke
Mobilox-UI-velden bewijst. De nieuwe parser bewaart top-level `opmerkingen`,
`omschrijving`, `introductietekst` en `advertentietekst` alleen wanneer ze werkelijk
aanwezig zijn. De laatste twee zijn optionele expliciete veldnamen, geen bevestiging
dat Mobilox ze daadwerkelijk levert. De UI toont de exacte bronnaam en verzint
geen relatie tussen `opmerkingen` en een Mobilox-UI-label. Broninhoud blijft intact;
de website rendert tekst als tekst, nooit als ongefilterde HTML.

## Opslaan, toegang en gelijktijdigheid

PATCH `/api/vvos/vehicles/{id}/editorial` vereist `vehicles.write`, valideert een
beperkte opdracht en schrijft foto-/optie-/tekstwijziging plus auditrecord in één
Firestore-transactie. Een verouderde gebruikersrevisie geeft 409; import en
beheer mergen altijd tegen de actuele snapshot. Algemene formulieropslag gebruikt
een transactie met updatedAt-controle om een gelijktijdige sync niet te overschrijven.
De bestaande rollenmatrix bepaalt wie de nieuwe beheeracties mag uitvoeren.

Ruwe voertuigen zijn in Firestore voortaan alleen leesbaar voor personeel.
Publicatie loopt via de serverprojectie. Editorial kan niet rechtstreeks vanuit
de browser worden overschreven. Firestore-regels moeten samen met de release
worden uitgerold. Mobilox-foto-URL's zijn openbare bronverwijzingen: 'intern'
betekent uitgesloten van website/feed, geen intrekking van een eerder gedeelde URL.
Handmatig verwijderen wist de bronfoto in Mobilox niet.

## Controle en beperkingen

Tests behandelen scenario's A-K, dubbele inhoud, de volledige 200-fotoparser,
meer dan 40 opties, revisieconflicten en API-autorisatie/validatie.
Een gewijzigde foto-URL geldt bewust als een nieuwe foto;
zonder een eigen kopie vergelijkt VVOS geen afbeeldingsinhoud. Een al vóór deze
release verloren foto kan alleen met een nieuwe provideraanlevering worden
teruggehaald. Geen live data worden automatisch gemigreerd of opnieuw
gesynchroniseerd tijdens het bouwen van deze wijziging.
