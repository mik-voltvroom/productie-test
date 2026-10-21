# VV Stories / Social Video Engine v1

Status: featurebranch `agent/social-video-engine-v1`. Geen productie- of accountkoppelingen.

## Doel

Sociale video is een VVOS-contentobject met commerciële context. De website toont alleen door VVOS goedgekeurde records en laadt externe spelers pas na expliciete interactie.

## Datamodel

Firestore collectie: `socialVideos`.

Belangrijkste velden:
- `id`: deterministisch op basis van platform + externe video-identiteit;
- `platform`: `tiktok | youtube | instagram | native`;
- `sourceUrl`, `externalId`, `embedUrl`, `thumbnailUrl`;
- `status`: `draft | review | published | archived | unavailable`;
- `sourceState`: `unchecked | available | unavailable | unknown`;
- `sourceCheckedAt`;
- `contentType`, `brand`, `model`, `vehicleIds`, `carCheckId`, `vvVerifiedId`;
- `placements`: homepage, inventory, vehicleDetail, carCheck, knowledge;
- interne analytics-tellers.

Interne analytics en bronstatus worden niet via de publieke SocialVideo allow-list ontsloten.

## Importflow

1. Medewerker plakt een ondersteunde HTTPS-URL in VVOS.
2. Provider herkent platform en externe ID.
3. VVOS normaliseert de URL en maakt een deterministisch document-ID.
4. Firestore `create()` blokkeert een dubbele import atomisch.
5. Nieuwe video start in `review`.
6. Medewerker controleert/corrigeert relaties en plaatsingen in de review-editor.
7. Pas status `published` maakt het record publiek opvraagbaar.

Een redactionele wijziging aan een reeds gepubliceerde video zet de video automatisch terug naar `review`. Daarmee kan gewijzigde content niet ongemerkt gepubliceerd blijven.

Ondersteunde handmatige bronnen in v1:
- YouTube watch, Shorts, youtu.be;
- volledige TikTok `/video/{id}` URLs;
- Instagram `/reel/{id}` en `/p/{id}` URLs.

Lookalike-hostnames zoals `notyoutube.com` worden geweigerd. Alleen HTTPS is toegestaan.

## Publicatie

Publiek:
- `/uit-de-praktijk`;
- maximaal vier homepage-items;
- voertuigdetail via `vehicleIds` + `vehicleDetail`;
- VV Verified / CarCheck via `carCheck` placement.

Alle publieke queries filteren op `status == published`.

Homepage, voertuigdetail en VV Verified gebruiken 60-seconden revalidatie. `/uit-de-praktijk` wordt dynamisch opgebouwd. Nieuwe of gewijzigde videoselecties vereisen daardoor geen nieuwe applicatierelease.

## Voertuig-URL's

`vehicleId` is uitsluitend een relatie-ID en mag niet als publieke URL-slug worden gebruikt. De `SocialVideo` component toont een voertuig-CTA alleen wanneer de voorraadlaag een expliciete `vehicleHref` heeft opgelost.

Zodra de echte voorraadfeed beschikbaar is moet de inventory-adapter daarom minimaal kunnen leveren:
- definitief VVOS vehicle ID;
- publieke slug;
- publieke publicatiestatus;
- optioneel displaylabel voor de CTA.

## Privacy en performance

- Geen OAuth of social access tokens in v1.
- Geen client-side credentials.
- Externe iframe verschijnt pas na klik.
- YouTube gebruikt `youtube-nocookie.com`.
- Alleen publiek-veilige velden verlaten de server.
- `socialVideos` is in Firestore Rules expliciet server-only; browserclients hebben geen directe read/write-toegang.
- Verwijderde bronnen kunnen via de interne broncontrole naar `unavailable` worden gezet; zo verdwijnen ze uit publieke queries.
- Een bron die bekend `unavailable` is kan server-side niet opnieuw worden gepubliceerd totdat hij opnieuw is gecontroleerd.

## Broncontrole

Interne endpoint:

`POST /api/social-videos/{id}/availability`

Gedrag:
- vereist `socialVideos.write`;
- gebruikt alleen providergebonden externe URLs;
- 5 seconden timeout;
- 404/410 => `unavailable` en video-status `unavailable`;
- 2xx/3xx => `available`;
- rate-limit/andere fout => `unknown`, geen destructieve statuswijziging;
- wanneer een eerder onbeschikbare bron terugkomt, gaat de video naar `review`, niet automatisch terug naar `published`.

De broncontrole is in v1 handmatig vanuit VVOS. Automatisch periodiek controleren hoort bij een latere scheduler/automation-stap en mag pas na stagingacceptatie worden geactiveerd.

## Firestore-indexen

`firestore.indexes.json` bevat de samengestelde indexen voor:
- `status + vehicleIds`;
- `status + placement`;
- `status + placement + vehicleIds`.

Deze indexconfiguratie staat alleen in code totdat expliciet akkoord is gegeven om staging-Firestore te wijzigen. Een stagingdeploy van de indexen hoort bij de acceptatiestap, niet bij deze featurebranch.

## Analytics

Publieke events worden provider-neutraal vastgelegd. De huidige kern bevat onder andere:
- `video_impression`;
- `video_play`;
- `video_vehicle_click`;
- `video_carcheck_click`;
- contact-/proefritgerelateerde videoconversies.

VVOS bewaart alleen tellingen per video voor deze eerste release; klantdata wordt niet in het SocialVideo-object opgeslagen.

## Rechten

- owner/admin/marketing: beheer;
- sales/workshop: lezen volgens de huidige permissions;
- publieke bezoeker: uitsluitend `published` allow-listed metadata via de server-API.

## Review-editor

Na import kunnen bevoegde medewerkers corrigeren:
- titel en contenttype;
- merk en model;
- vehicle IDs;
- VV Verified- en CarCheck-relaties;
- tags;
- homepage/voorraad/voertuigdetail/CarCheck/kennisbank-plaatsingen;
- featured-status.

Optionele waarden kunnen ook weer gecontroleerd worden gewist.

## Nog niet geactiveerd

- TikTok/YouTube/Meta OAuth;
- automatische social-inbox;
- automatische socialpublicatie;
- periodieke availability scheduler;
- native mastervideo upload naar eigen storage;
- AI-autopublicatie;
- volledige lead/deal/marge-attributie;
- productie-release.

## Voorraadkoppeling

Wanneer de echte voorraadfeed beschikbaar is:
1. gebruik het definitieve VVOS vehicle ID als `vehicleIds[]`;
2. resolveer het ID naar een echte publieke slug voordat een voertuig-CTA wordt getoond;
3. valideer dat een voertuig publiek publiceerbaar is voordat een videolink publiek wordt getoond;
4. koppel modelvideo's los van voertuig-specifieke video's;
5. test sold/archived gedrag zodat oude voertuigvideo's niet naar een niet-bestaande CTA linken.

## Releasegate

Niet mergen/deployen zolang niet groen:
- dependency audit;
- repo guard;
- agent audit;
- TypeScript typecheck;
- Vitest;
- Next.js production build;
- review van publieke data allow-list;
- Firestore-indexconfiguratie aanwezig;
- server-only Firestore rule aanwezig;
- staging smoke-test na expliciet akkoord.
