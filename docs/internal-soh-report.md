# Intern VV SOH-certificaat

Op `/dashboard/voorraad/[id]` staat het SOH-paneel binnen het bestaande voertuig­dossier. Voertuiggegevens en de eerste foto komen uit de bestaande Mobilox-gesynchroniseerde `Vehicle`; er is geen tweede import of handmatig voertuigformulier.

1. Een medewerker vult gemeten SOH (0–100%), meetmethode en meetdatum in.
2. **Meting valideren en opslaan** bevestigt de meting en legt de actuele voertuigkaart vast.
3. **Certificaat previewen / printen** opent `/dashboard/voorraad/[id]/soh`.
4. **Printen / opslaan als PDF** opent de browserprintdialoog: A4-portret, schaal 100%, browserkop- en voettekst uit. Kies een printer of Opslaan als PDF.

## Beveiliging en opslag

- GET `/api/vvos/vehicles/[id]/soh` vereist een geverifieerde VVOS-sessie met `vehicles.read`; responses zijn `private, no-store`.
- POST vereist `vehicles.soh.write`: owner, admin, sales en workshop. Marketing, finance en readonly kunnen geen meting valideren.
- POST vereist een origin die overeenkomt met de request-URL of de expliciet geconfigureerde `NEXT_PUBLIC_SITE_URL`. Zo blijft de externe HTTPS-origin geldig als App Hosting na TLS-terminatie een interne URL doorgeeft. Ontbrekende/ongeldige origins en cross-site fetches worden geweigerd; Host-/forwarded-headers voegen geen vertrouwde origins toe. Dezelfde controle geldt voor interne voertuigopslag. Voertuig-ID, payloadgrootte en strikt schema blijven gecontroleerd. De medewerker-ID en validatietijd worden uitsluitend server-side vastgesteld.
- Een transactie leest het voertuig en de huidige rapportrevisie. Verouderde voertuigdata of gelijktijdige validatie levert 409 op; herlaad het dossier. Onvolledige brongegevens worden niet verzonnen. Toekomstige en ongeldige meetdatums worden geweigerd.
- Elke validatie maakt een nieuw onveranderlijk document in `sohCertificates`, actualiseert de afzonderlijke `vehicleSohReports`-verwijzing en schrijft een audit-event. Eerdere certificaten worden niet overschreven. Er wordt niets aan `vehicles` of publieke projecties gewijzigd.
- Beide SOH-collecties weigeren alle directe Firestore-clientreads en -writes. Alleen de geautoriseerde API gebruikt Firebase Admin. De bestaande databaseconfiguratie bepaalt de omgeving.
- De PDF wordt via de browser opgeslagen of geprint. Er is geen openbare PDF-URL, bron-PDF-opslag, QR-code, publieke publicatie of klantportaalkoppeling.

## Ontwerp en bron

Ontwerp 3: rustig certificaat, VVSOH-titel, voertuigkaart, gemeten State of Health, meetinformatie, toelichting en paraafruimte. Beschikbare Mobilox-accuopgaven zijn expliciet afzonderlijk weergegeven; ze worden niet als gemeten SOH of bruikbare kWh gepresenteerd.

De voertuigkaart identificeert het voertuig primair met het aangeleverde chassisnummer (VIN). Een kenteken verschijnt alleen indien beschikbaar; een ontbrekend kenteken blokkeert het certificaat niet. De interne voertuig-ID blijft de veilige opslagkoppeling.

Manrope voor koppen, Inter voor body/interface, bestaande VV-kleurtokens. `public/brand/vv-logo-horizontal.svg` is identiek aan `VV_Design_System_v1.2_RC_20260811/02_LOGOS/SVG_LIVE_MANROPE/VV_logo_primary_horizontal.svg` (SHA256 `C34BC65E1D972046CB73013463A5787EE1F6344CC0C604E9B712BFB2C34752BB`). De nieuwe `vv-logo-horizontal-outlined.svg` behoudt deze geometrie en zet uitsluitend de bestaande woordmarkering met de officiële Manrope 500 naar contouren om. Dit voorkomt fontvervanging binnen een extern SVG-afbeeldingselement.

De printknop wacht op fonts en afbeeldingen en meet de inhoud op A4-breedte. Lange bronvelden worden voor afdrukken proportioneel verkleind, zonder velden af te kappen. Preview blijft responsief op mobiel/tablet/desktop.

## Validatie

### Praktijkbereik uit Mobilox

VV gebruikt Eigen identificatie voor praktijkbereik in hele kilometers: `320` wordt `realisticRangeKm: 320` en verschijnt als `320 km` op de bestaande interne showroomkaart en in nieuwe SOH-momentopnamen. De import leest `voertuignr_klant` en de expliciete aliases `custom_id` / `eigen_identificatie`. De Mobilox-interface benoemt dit veld `CUSTOM_ID`; de precieze XML-exportnaam is nog niet met een actuele ontvangen payload gecontroleerd. Controleer die bij de eerstvolgende synchronisatie. Alleen een positief geheel getal wordt geaccepteerd; lege, negatieve, decimale of tekstwaarden geven geen praktijkbereik. WLTP en officieel brandstofverbruik behouden hun eigen bronvelden. De publieke projectie bevat dit interne veld niet.

Een volgende volledige synchronisatie vervangt of verwijdert het praktijkbereik op basis van de bron. Processorversie 7 voorkomt dat een opnieuw aangeboden payload uitsluitend vanwege verwerking onder de oude parser wordt overgeslagen. Er is geen bulkherimport of productiemutatie uitgevoerd. Eerder gevalideerde certificaten blijven hun oorspronkelijke momentopname tonen.

### Aparte invulvelden in het voertuigdossier

Elk bestaand dossier heeft onder Interne gegevens afzonderlijke velden **WLTP (km)** en **Praktijkbereik (km)**. Standaard tonen ze de betreffende Mobilox-bronwaarden. Owner/admin/sales kunnen via de bestaande beveiligde interne opslagroute handmatige waarden bewaren. Die staan afzonderlijk in `rangeOverrides` en blijven behouden bij Mobilox-synchronisaties. Een expliciet leeg veld is `null`; een ontbrekende sleutel gebruikt de bron. **Mobilox-waarde gebruiken** verwijdert de handmatige keuze na opslaan.

Showroomkaart en nieuwe SOH-certificaten gebruiken dezelfde opgeslagen waarden, met bronvermelding in het certificaat. SOH-validatie is geblokkeerd zolang gewijzigde bereikvelden nog niet zijn opgeslagen. Publieke voertuigvelden blijven de Mobilox-bron gebruiken en ontvangen geen interne overrides. Oude clients die `rangeOverrides` niet meesturen laten bestaande keuzes intact. De bestaande rechten, transacties, conflictdetectie en audit blijven van toepassing.

Tests dekken invoer, bronmomentopname, gescheiden bron-/meetwaarden, rechten, origin, injectie, foutstatussen, transacties, conflicten, verkeerde voertuigkoppeling, veilige HTML-rendering en A4-schaalberekening. Firestore-emulatortests dekken de twee gesloten SOH-collecties. Voer `npm test`, `npm run test:rules`, `npm run typecheck` en `npm run build` uit. `test:rules` vereist Java 21; de bestaande CI installeert dit.

Deze PR mag niet automatisch gemerged of gedeployed worden. Geen productiegegevens of Firebase-regels zijn tijdens ontwikkeling gewijzigd.
