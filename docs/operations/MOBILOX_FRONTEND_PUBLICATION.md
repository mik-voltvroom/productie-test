# Mobilox-inhoud rechtstreeks op de website

## Uitgewerkt voorstel — 7 oktober 2026

Mobilox levert de openbare inhoud. De browser krijgt uitsluitend de publieke voertuigprojectie uit de laatst succesvol ontvangen bronstaat. Authenticatie, XML-validatie, verwerking en Firestore-toegang blijven op de server. Er komt geen Mobilox-secret in JavaScript en geen tweede providerkoppeling in de browser.

Datastroom:

1. Mobilox stuurt XML naar `POST /api/hexon/inventory`; de compatibiliteitsroute deelt dezelfde processor.
2. De server controleert Basic Auth, invoer, verplichte velden, contentgroepen en toegestane HTTPS-fotohosts.
3. Eén transactie vervangt de openbare broninhoud en bewaart interne kosten, commerciële historie en dealrelaties. Succes wordt pas daarna bevestigd. Verwijdering archiveert; historie blijft bestaan.
4. De server leest Firestore bij een nieuw paginaverzoek en projecteert alleen publieke velden. Foto’s, tekst en opties uit een geverifieerde import negeren oude handmatige overrides. De frontend bevat geen providerlogica.
5. De browser laadt de bronfoto’s en toont tekst als tekst. Geen extra permanente polling of publieke toegang tot ruwe Firestore-documenten. Een reeds open pagina krijgt de nieuwe inhoud bij een nieuw verzoek/herladen.

De import, autorisatie en vervanging zijn al aanwezig in main. Deze vervolgaanpassing trekt de compatibiliteitsprojectie gelijk: elektrische specificaties komen uit dezelfde canonieke velden, lege opties kunnen geen oude accessoires terugbrengen, en ongeldige/verwijderde/gereserveerde voertuigen zijn niet beschikbaar. De editorial-API-tests gebruiken de echte afwijzende repository; een gemockte succesvolle handmatige wijziging is geen geldig bewijs meer.

## Vastgestelde fotofout en grenzen van het bewijs

De herhaalde publieke controle op 7 oktober 2026 om 02:24 CEST gaf voor de door de gebruiker opgegeven Velar:

- pagina HTTP 200;
- 16 fotoverwijzingen en 3.113 tekens beschrijving in de openbare Car-structured data;
- alle 16 fotoverzoeken HTTP 404, `text/plain`, bij `media-eigenwebsiteincrementeel.export.dv.nl`.

Bewijs: [Public vehicle images, run 37551753007](https://github.com/mik-voltvroom/productie/actions/runs/37551753007).
Dit bewijst dat die gepubliceerde bron-URL’s tijdens de controle geen foto opleverden. Het bewijst niet waarom de bestanden ontbreken, of de huidige XML andere URLs bevat, of dat de laatst gemergede code al live staat. Direct in de frontend laden repareert een 404 niet.

De controleauto is de Range Rover Velar `hexon-56821730`. Er is geen geïdentificeerde Ford. Het later geopende VVOS-dossier `hexon-57134262` is een ander dossier; gegevens niet vermengen.

## Bestaande voertuigen herstellen — afzonderlijke productieactie

1. Verifieer de actieve App Hosting-release, commit en het project `voltvroom-productie`. Een groene GitHub CI-run bewijst geen deployment.
2. Laat een recente volledige Mobilox-aanlevering voor de Velar beschikbaar maken. Controleer externalId, foto-URLs en bronvolgorde tegenover het actuele Firestore-document. Bevestig bij de provider of de fotolinks geschikt zijn voor permanente publieke weergave; stel dit niet vast op basis van een hostnaam. Als de provider tijdelijke exportlinks gebruikt, moet server-side duurzame opslag afzonderlijk worden ontworpen en gevalideerd.
3. Test de nieuwe bronlinks op HTTP-succes, afbeeldingstype en daadwerkelijke weergave. Raad geen URL-varianten en vervang een ontbrekende foto niet door een ander voertuig.
4. Maak een back-up en voer de bestaande `scripts/mobilox-repair.mjs` eerst als dry-run uit. De precieze commando’s en hash-/concurrentiecontroles staan in [MOBILOX_SOURCE_OF_TRUTH.md](./MOBILOX_SOURCE_OF_TRUTH.md).
5. Controleer de voorgenomen wijzigingen. Bestaande legacyselecties blijven tot een geverifieerde herimport alleen-lezen behouden, zodat privéfoto’s niet ineens openbaar worden. Die overgang is geen bevestiging dat legacydata actueel is.
6. Pas alleen na expliciete toestemming het goedgekeurde plan toe. Merge, code-/regeldeploy, provider-heraanlevering die productie wijzigt en herstelrun zijn afzonderlijke acties.
7. Vergelijk payload → opgeslagen document → openbare pagina: alle foto’s en volgorde, volledige tekst, opties, specificaties en status. Controleer afbeeldingen visueel op mobiel en desktop en herhaal de read-only fototest. Herhaal de herstelplanner: verwacht `noop`.

## Herhaalbare openbare controle

`node scripts/check-vehicle-images.mjs '<openbare voertuigdetail-URL>'`

De workflow `Public vehicle images` kan handmatig dezelfde controle uitvoeren. Deze gebruikt geen Firebase-credentials, wijzigt geen voorraad en logt geen volledige foto-URLs of downloadtokens. Alleen vooraf toegestane publieke hosts zijn bereikbaar, ook bij redirects. Een foutstatus blijft een fout; de test vervangt of verbergt geen foto’s. Deze netwerkcontrole bewijst bereikbaarheid en contenttype, niet de visuele juistheid van de auto of de vergelijking met Mobilox.

## Nog niet uitgevoerd

Geen merge, deployment, productieherstel, verzending van een Mobilox-mutatie of wijziging van Firebase-regels. De huidige bronpayload en opgeslagen productievelden zijn nog niet naast elkaar geverifieerd. Daarom is volledig productieherstel nog niet aangetoond.
