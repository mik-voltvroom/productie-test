# Publieke voertuiglookup en conditie

## UsedCondition: expliciete zakelijke bron

Op 17 oktober 2026 bevestigde de opdrachtgever op de vraag of alle websitevoertuigen gebruikte occasions zijn, inclusief voertuigen met 0 km: **"Ja, uitsluitend gebruikte occasions"**. Dit is een bevestigd voorraadbeleid, geen afleiding uit kilometerstand, bouwjaar of tenaamstelling. Het bewijst geen individuele technische voertuigconditie.

`publicStockCondition` in `lib/vehicle/business.ts` deelt dit beleid tussen Car/Product `itemCondition` en de bestaande Merchant-feedconditie `used`. [Schema.org UsedCondition](https://schema.org/UsedCondition) betekent dat het aangeboden product gebruikt is. Bij wijziging van het assortiment moet dit beleid vóór publicatie opnieuw worden beoordeeld en zo nodig door een expliciet bronveld worden vervangen. Tests dekken 0 km, positieve en ontbrekende kilometerstanden.

## Lookupcontract versie 1

`publicLookup` is uitsluitend servermetadata: genormaliseerde VIN-/kentekensleutels en huidige/eerder waargenomen slugs. De publieke allowlist verwijdert dit veld. Inkomende providerhistorie wordt genegeerd. De volledige Mobilox-vervanging en het bestaande reparatiepad gebruiken dezelfde builder; processorversie 9 verwerkt ook opnieuw aangeboden identieke payloads volgens dit contract. Deal-, interne kosten- en SOH-updates behouden deze velden. Nieuwe voertuigen worden in productie uitsluitend via Mobilox aangemaakt; de demo-seed schrijft niet naar Firestore.

Een historische redirect ontstaat alleen bij hetzelfde document-ID én een overeenkomende genormaliseerde VIN of kenteken. Een gewijzigde fysieke identiteit of ontbrekend identiteitsbewijs draagt geen aliases over. Onbekende historische URLs worden niet gereconstrueerd uit merk/model. De backfill kent uitsluitend de huidige slug en reeds geldige opgeslagen historie; oude bronbestanden vereisen afzonderlijk bewezen koppeling en goedkeuring.

Er is geen automatische vervaldatum: maximaal 200 unieke slugs per voertuig, daarna faalt de import expliciet voor beoordeling; niets wordt stilzwijgend verwijderd. Slug A → B → C verwijst direct naar C. Terugkeer C → A veroorzaakt geen lus: A is dan weer de actuele pagina. Herpublicatie van dezelfde bewezen identiteit kan bestaande aliases hergebruiken, zolang de bron ze heeft behouden. Een hergebruikt extern ID met een andere identiteit neemt de oude historie niet over.

Lookup controleert de huidige publicatiepoort vóór ontdubbeling. De volledige verbonden identiteitscomponent wordt gelezen: bij A–B–C kan B vervallen terwijl C geldig blijft. De bestaande nieuwste-eerstselectie blijft intact; gelijke tijdstippen volgen Firestore-document-ID-volgorde. Maximaal 1000 component-/slugclaimdocumenten; een grotere of ongeldige component geeft een technische fout, geen misleidende 404. Een ontbrekende index of opslagfout geeft dezelfde expliciete bronfout.

De slugquery betrekt ook ingetrokken geregistreerde claims. Twee verschillende bewezen voertuigen die hetzelfde adres claimen veroorzaken een technische fout; er wordt geen willekeurige auto aangeboden. Bij dezelfde fysieke identiteit blijft de bestaande deduplicatie leidend. Een onderdrukt duplicaat krijgt geen zelfstandig aanbod. Verkochte, gereserveerde of verborgen voertuigen geven geen historische redirect. De laatste publicatiestatus, claims en identiteit worden in één read-only Firestore-transactie gelezen.

Historische en Mobilox-ID-links gebruiken **307** naar de actuele slug en behouden herhaalde queryparameters, gclid en UTM. Canonicals blijven queryvrij. Bestemming en beschikbaarheid zijn veranderlijk; er wordt geen permanente browserredirect vastgezet. Permanente domein-/hostingverhuizingen vallen buiten dit voertuigcontract. Niet gevonden blijft 404; geen catch-all naar aanbod/homepage.

## Gefaseerde ingebruikname — afzonderlijke toestemming vereist

Deze PR voert geen productiebackfill uit. Zonder `seoState/publicVehicleLookup` met `{version:1,state:"ready"}` gebruikt lookup een volledige consistente legacy-scan, inclusief bekende historische claims. Daarmee blijven oudere records vindbaar. De voorraadlijst/feed/sitemap blijven volledig gepagineerd lezen. Alleen een gecontroleerde backfill mag de readiness-marker activeren.

1. Beoordeel en deploy na toestemming de composite index `status ASC + publicLookup.identityKeys CONTAINS`. De slug-array gebruikt de standaard enkelveldindex. Wacht tot de index klaar is.
2. Deploy alle nieuwe schrijvers; beëindig oude instances/jobs, inclusief oude reparatiescripts. Verifieer de uitgerolde commit. Externe Admin-writers buiten deze repository mogen dit contract niet omzeilen. Bij onzekerheid blijft de marker uit.
3. Maak een private dry-run (geen credentials of bronrecords in console/Git):

   `node scripts/vehicle-lookup-migration.mjs --project PROJECT_ID --plan PRIVATE_PLAN.json`

   `FIREBASE_ADMIN_PROJECT_ID` moet exact hetzelfde project zijn. Een offline analyse gebruikt `--snapshot PRIVATE_SNAPSHOT.json` in plaats van `--project`; de snapshot is een object met document-ID als sleutel. Het plan bevat hashes, IDs en tellingen, geen VIN-/kentekenwaarden.
4. Beoordeel plan, project, writer-commit en afzonderlijke migratietoestemming. Pas dan dezelfde opdracht met `--apply --writers-deployed DEPLOYED_COMMIT_SHA` toe. Dit argument is de expliciete operatorverklaring dat alle schrijvers bijgewerkt zijn, geen automatische deploymentdetectie.
5. De routine zet de marker op `building`, controleert per document de volledige voorafgaande hash en schrijft uitsluitend `publicLookup`, zonder `updatedAt`, broncontent, prijs of publicatie te wijzigen. Daarna controleert één transactie alle huidige lookupvelden en activeert pas bij volledige dekking `ready`.
6. Bij onderbreking/bronwijziging blijft de legacy-route actief. Maak een nieuwe dry-run; voer geen oud plan geforceerd uit. Controleer vervolgens beide query's en huidige/alias/ingetrokken routes in de gekozen omgeving.

Rollback: zet na toestemming eerst de marker op `building` (legacy-selectie), draai daarna de code terug. Laat opgeslagen historie behouden; het veld heeft geen invloed op oude code. Vóór heractivatie moeten alle schrijvers opnieuw bijgewerkt, records opnieuw beoordeeld en dekking opnieuw geverifieerd zijn. Dit is geen toestemming om die handelingen uit te voeren.

## Verificatiegrenzen

Vitest dekt selectie, ketens, collisions, 0 km en foutpaden. `npm run test:rules` voert tevens de echte Admin-query's en dry-run/stale-plan/apply tegen een verplicht lokale emulator met vast synthetisch testproject uit. Clientrechten op `seoState` blijven standaard geweigerd. De emulator controleert geen vereiste productie-indexbeschikbaarheid; dat vraagt afzonderlijke controle na indexdeployment. CI is onafhankelijk van productievoorraad en Google.
