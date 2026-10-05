# Voertuigcontact: productiekandidaat

Deze wijziging is alleen een concept-PR voor review. Geen merge, deployment, providerinstelling, credentialwijziging of echte testmail is uitgevoerd.

## Scope en productiebasis

- Repository: `Volt-Vroom/productie`; branch: `hardening/vehicle-contact-production`.
- Productie-main `8144d96e0109ecca56d2eb64af7c3af1f2f3410d` bevat PR #52 die de lege autokeuzelijst verwijderde. De eigenaar bevestigde expliciet dat deze kandidaat de werkende autokeuzelijst moet herstellen.
- De twee bestaande voertuig-proefritbuttons en de voorraadvraag linken naar `/contact?vehicleId=...&intent=...#aanvraag`.
- Contact leest de huidige publieke voorraad via de bestaande productierepository. De server controleert het publieke ID opnieuw via directe lookup en bepaalt zelf de betrouwbare titel.
- Datum en dagdeel zijn voorkeuren, geen reservering. Client en server delen validatie; de bevestiging vermeldt dat de afspraak pas na persoonlijk akkoord vaststaat.
- Algemene contactaanvragen en keuzehulp blijven mogelijk zonder voertuig of moment. De bestaande inruilroute is ongewijzigd.
- Productie-Google Chat-notificaties blijven na succesvolle opslag plaatsvinden. Falen van een notificatie maakt een al opgeslagen aanvraag niet opnieuw verzendbaar.
- Productie-leaseberekening, indicatieve renteconfiguratie, lege bedragvelden, voorraadpublicatie/fotoprojectie en consented analytics blijven behouden. Alleen de lease-submitguard is synchroon gemaakt tegen dubbelklikken.

## Lokale verificatie (CAROUTLET, 5 oktober 2026)

- Node 24.19.0 / npm 10.9.4; CI gebruikt Node 22 en Java 21.
- Voor de applicatieport: 216 bestaande tests groen na dependency-installatie.
- `npm run check`: repo-, agent- en brandgates, typecheck, tests en geoptimaliseerde Next-build. Bestaande autoprefixer-waarschuwingen in ongewijzigde stylesheets zijn geen fouten.
- Contactbrowser: desktop 1440px, tablet 768px, mobiel 390px en 320px; geselecteerde auto, deeplinks, lege/ongeldige/verwijderde IDs, validatie/focus, algemene aanvraag, 400/429/500/503, netwerkfout, retry, dubbel-submit en succes zonder boekingsbelofte.
- Leasebrowser: beide soorten aanvraag naast elkaar, leeg formulier, gewone dubbelklik en twee clicks binnen dezelfde render, fout/retry en 768/390/320px. Icons 1440/390px is ongewijzigd en wordt als layoutregressie gecontroleerd.
- De inruilstap wordt semantisch op zichtbaarheid gecontroleerd: productie-CSS toont de tekst in hoofdletters. De drie stappen en het oorspronkelijke voertuig-ID blijven aanwezig.
- Browserrequests buiten localhost zijn geblokkeerd. `/api/leads` is uitsluitend in de browser gemockt. De echte lokale demo-endpoint geeft 503 zonder opslagconfiguratie; er wordt geen fictief productiesucces gemeld.
- Rapporten/screenshots staan lokaal onder `../qa/production-port/`; de PR-beschrijving bevat de definitieve aantallen en CI-link voor de exacte commit.

## Dependency-hardening

Next 15.5.27, sharp 0.35.5, gRPC 1.14.5 en uuid 11.1.1 (CommonJS-compatibel voor bestaande SDKs). Busboy heeft een minimum override 3.2.2; de productielock had die patch al. Firebase 12.16.0, Firebase Admin 13.10.0, qrcode.react 4.2.0 en Vitest 5.0.1 blijven ongewijzigd. Alleen bijbehorende transitive/native versies en deduplicatie veranderen.

`npm audit --omit=dev`: 0 kwetsbaarheden, tegenover 11 op de oorspronkelijke lockfile. Offline SDK-, UUID- en sharp-smoketests zijn toegevoegd. Dit is geen claim dat iedere ontwikkeldependency vrij van advisories is.

## Nog vereist vóór een afzonderlijk goedgekeurde live release

1. Review de exacte PR-head-SHA en wacht op terminale groene CI, inclusief Firestore Rules emulator. Bestaande CI-env is een testomgeving, geen bewijs van live runtimeconfiguratie.
2. Controleer in de bevoegde productieruntime `npm run validate:env` en `npm run readiness`, de runtime identity, leadopslag en notification-configuratie. De geïsoleerde checkout heeft geen secrets; beide lokale configchecks rapporteren daarom niet-ready. Dit bewijst niet dat de live configuratie ontbreekt.
3. Target uitsluitend Firebase-project `voltvroom-productie`, backend `productie`, domein `https://www.voltvroom.nl`. Vertrouw niet op een Firebase-default: de gecommitteerde `.firebaserc` bevat nog een staging-default. Geen deploymentconfig is in deze PR gewijzigd.
4. Noteer de daadwerkelijk bediende, vorige release-SHA en de herstelbare rollout vóór promotie. Laat de eigenaar expliciet de exacte nieuwe SHA en live release goedkeuren.
5. Voer na die toestemming een smokecheck uit met actuele productievoorraad: beide buttons, juiste ID/titel, algemene aanvraag, foutweergave, opslag en interne notificatie. Verstuur alleen een echte testaanvraag wanneer dat afzonderlijk is toegestaan; gebruik geen klantgegevens.

Deze concept-PR maakt de code reviewbaar en getest; zij geeft geen toestemming voor merge, live mails, Firebase-writes of productiepublicatie.
