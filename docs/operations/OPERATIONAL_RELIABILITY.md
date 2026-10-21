# VVOS operationele betrouwbaarheid — lokale oplevering

Datum: 21 oktober 2026. Status: lokaal geïmplementeerd en getest; niet gepusht, geen PR aangemaakt, niet uitgerold. Dit document is geen productieverklaring.

## Basis en vergelijking

- Repository: `mik-voltvroom/productie`, bevestigde standaardbranch `main`.
- Schone uitgangscommit: `00d6709e11ad66e98de7b846cde33d3b0480e4c5`; werkbranch `fix/vvos-operational-reliability`.
- Lokaal Node 24.19.0 / npm 11.17.0; repository declareert npm 10.9.4, CI gebruikt Node 22. CI voor deze patch is nog niet uitgevoerd.
- Alle tien genoemde referenties zijn gevonden in de alleen-lezen projectbronnen: rc2 developer pack, rc2 ready, v1.1 Morning Intelligence, rc1 agent complete, CarCheck PWA, design-system-PDF en zip, brandbook, huisstijlmap en strategie.txt. Geen archief als implementatiebasis teruggezet.
- Inhoudsvergelijking rc2-ready/v1.1, na verwijderen van de `VVOS/`-prefix en uitsluiten van build/dependency/git-bestanden: 129 gelijk, 9 gewijzigd, 13 alleen rc2, 5 alleen v1.1. Zie `reference-comparison.json` naast dit document. Rc2 heeft extra deployment/runbook/configuratiebestanden; v1.1 voegt een demo-afhankelijke intelligence-engine toe. De actuele main bevat veel latere beveiligings-, voorraad- en SEO-correcties en is daarom leidend.
- Design System v1.2 RC pagina 4–5 en Brandbook bevestigen Ice Blue, Deep Ink, Graphite, Manrope en Inter. Het design-systemdocument benoemt outline-assets nog als open punt; dat bewijst geen actuele goedkeuring. Bestaande officiële assets en fonts behouden; geen vervangend logo gegenereerd.

## Bevindingenmatrix

| Onderdeel | Huidige basis / referentie | Vastgesteld probleem | Gekozen actie | Verificatie |
| --- | --- | --- | --- | --- |
| Auth | Main heeft sessies, rechten en lokale bypass; oudere lagen conditionele auth | Ontbrekende rol kreeg fallback; ongeldige cookie kon throwen; centrale mutatiegrens nodig | Erkende rol verplicht, decodefout gecontroleerd, origincontrole, hosted demo geblokkeerd | Auth-tests inclusief vervalste/ingetrokken sessie en vreemde origin |
| Data | Publieke voertuigallowlist bestaat al | Ruwe clientreads en CRM-writes omzeilden servergrens; opslaghelper kon zonder DB resultaat geven | Server-only Firestore, geautoriseerde CRM-API, DB-fout is fout, financiële velden per rol | Rules, API- en uitvaltests |
| Leads | Main bewaart notificatiestatus al duurzaam | Retry kon nieuwe lead maken; interne opvolging niet betrouwbaar opgeslagen | Transactionele aanvraagcode, CRM-transacties, expliciete notificatieherhaling | Emulator: gelijktijdige retry één lead, notificatiefout verliest lead niet |
| Voertuigen | Mobilox volledige bronrecords en publicatievoorwaarden bestaan | Historische hypothese over ruwe publieke kosten geldt niet voor huidige allowlist; interne toegang wel aangescherpt | Importcontract behouden; nieuw CRM koppelt aan bestaand voertuig-ID | Bestaande import/publicatie/dealtests plus geïntegreerde leadflow |
| Morning Intelligence | Huidige dashboardlayout, historische v1.1 demo-engine | Voorraadleeftijd op wijziging, onvolledige kosten als marge, onbewezen gezondheid | Expliciete voorraadstart, onbekende dekking, opvolgdeadline/contact, gecontroleerde bronlabels | Intelligence-tests, bron- en foutweergave |
| CarCheck | Losse PWA alleen lokale opslag en onvolledige score | Geen gedeeld inspectiedossier/vrijgave | Centrale onveranderlijke revisies, bewijs, concept/controle/vrijgave, aparte publieke samenvatting | Business- en emulatortests; responsive foutstatus |
| Portal | Bestaande tokenroute en demoresultaten | Geen voldoende beperkte, herroepbare toegang | Willekeurige gehashte tokens, 7 dagen, rotatie/intrekking, alleen afleverstatus | Emulator: verlopen/ingetrokken token en projectie |
| Finance | Voorbeeldrepositories en previews | Geen bewezen echte administratie achter cijfers | Productiepagina's tonen ontbrekende koppeling; APIs 503, demo expliciet lokaal | Geen productie-demobedragen of fictieve reconciliatie |
| Merk/SEO | Main heeft fonts, metadata, sitemap en consent | Publieke widgets op dashboard; Merchant-workflow importeert script zonder checkout | Private routeboundary, workflow checkout/PYTHONPATH | Render-/SEO-tests, live read-only Merchant-check |

## Datastromen en verantwoordelijkheden

UI → geautoriseerde server-API → repository/transactie → Firestore. Directe clienttoegang tot voertuigen, leads, klanten, taken en CRM-records is gesloten. Rechten blijven de bestaande rollenmatrix volgen; er is geen nieuwe permissiestructuur. Interne voertuigkosten worden alleen teruggegeven bij `finance.read` of `vehicles.internal.write`. De bestaande readonly-rol heeft volgens die matrix finance-leesrecht; review deze bedrijfskeuze vóór ingebruikname.

Publieke aanvraag → bestaande invoer-/spam-/quotacontrole → atomair lead + gehashte aanvraagcode → bestaande Google Chat-notificatie. Een notificatiefout vernietigt geen lead. Herhalen met dezelfde aanvraagcode en inhoud geeft dezelfde lead terug, ook als het voertuig inmiddels verkocht is. Andere inhoud met dezelfde code geeft conflict. Een nieuwe legitieme aanvraag gebruikt een nieuwe code. Oude API-clients zonder code behouden compatibiliteit maar krijgen deze deduplicatie niet. De browser bewaart de code gedurende dezelfde formulierpoging, niet over een volledige paginareload. Een medewerker kan een mislukte/niet-geconfigureerde melding, of pending ouder dan tien minuten, na expliciete controle van Chat opnieuw proberen. Dit is geen garantie op exactly-once aflevering bij een provider-timeout.

CRM bewaart eigenaar, status, opvolgdatum, contacthistorie, afspraken, conceptoffertes en inruilconcepten centraal. Statuswijziging krijgt een activiteitenrecord; echt vastgelegd contact actualiseert `lastContactAt`. Een klaargezet WhatsApp-bericht is geen gevoerd contact. Conceptoffertes blijven bestaande CRM-eurobedragen, geen fiscale facturen of nieuwe centenadministratie.

Mobilox/Hexon blijft eigenaar van openbare specificaties, prijs, advertentietekst, opties, bronstatus en fotovolgorde. Kosten, commercial, createdAt en dealreservering/verkoop blijven VVOS-eigendom. Zie het bestaande `MOBILOX_SOURCE_OF_TRUTH.md`: bronvervanging beschermt ontbrekende contentgroepen, maar behoudt bewust geen oude handmatige publieke foto-/tekstoverrides. Corrigeer die gegevens in Mobilox; introduceer geen stille tweede bron. De bestaande stabiele identiteit, herhaalbare imports, afhandeling van delete/reserved/sold, bronstatus en dealblokkades zijn niet vervangen. CarCheck-documenten staan apart van publieke foto's en buiten de importdocumenten.

## KPI-definities

Bron: geautoriseerde voertuig- en leadrepositories; generatietijd zichtbaar, dagen/presentatie Europe/Amsterdam. Dit is het ophaalmoment, geen bewijs dat de bron recent is bijgewerkt.

- Voorraad: bestaande beschikbare/gepubliceerde voertuigen volgens de publicatiepredicate.
- Retailwaarde: som vraagprijzen, geen omzet.
- Leeftijd: `commercial.stockEnteredAt`, anders `commercial.acquiredAt`; onbekend zonder die waarden. `updatedAt` reset leeftijd niet.
- Inkoop/kosten/marge: alleen bekende ingevoerde kosten; ontbrekende inkoop geeft onbekende marge. Verwachte marge is een scenario op ingevoerde kosten, geen volledige kostencontrole of gerealiseerd resultaat.
- Opvolging: open leads, verlopen/eerstvolgende deadline en laatste contact; ontbrekende eigenaar/deadline blijven signalen.
- Integratie: geconfigureerd betekent niet gezond. Geen automatische Merchant/live-claim zonder check.
- CarCheck: volledige inspectiedekking wordt per dossier en aandrijving berekend. Het dashboard claimt geen centraal volledig CarCheck-overzicht; een bulkaggregatie daarvan is nog niet toegevoegd.

## CarCheck en portaal

CarCheck vereist voertuig-ID, revisie en actuele voertuigversie. Eigen meting, document, fabrieksopgave en schatting blijven onderscheiden. Meetwaarde vereist eenheid, tijd, methode en bron; metingen/documentclaims vereisen bewijs voor vrijgave. Verplichte secties verschillen voor verbranding, hybride, plug-in en elektrisch. Onbekend/niet van toepassing voldoet niet aan een verplichte controle. Percentage is controldekking, geen kwaliteitskeurmerk.

Bewijsuploads: maximaal 10 MB JPEG/PNG/PDF met signaturecontrole, private Storage-route en metadata/hash in Firestore. Alleen serverauth biedt toegang; geen publieke downloadtokens. Vrijgave vereist eerst dezelfde inhoud in controlestatus. Vrijgegeven revisies blijven onveranderlijk bij nieuwe concepten. Publiek verschijnt uitsluitend de expliciet goedgekeurde tekst, rapport-ID, datum en dekking; geen inspector-ID, interne notities of bewijsbestanden. Menselijke reviewer moet persoonsgegevens en niet-onderbouwde tekstclaims uit de publieke samenvatting houden. Geen offline invoer/synchronisatie beloofd. Historische PWA-localStorage is niet gemigreerd.

Portaal is standaard uit (`VVOS_PORTAL_ENABLED=false`). Ingeschakeld biedt het alleen beperkte status/afleverdatum, geen documenten, klantdossier of betalingen. Token aanmaken/roteren/intrekken vereist serverrecht; token wordt niet automatisch verstuurd. Oude demo-/voorspelbare toegang vervalt.

## Controles en bewijs

| Controle | Vooraf | Definitieve lokale uitkomst |
| --- | --- | --- |
| Typecheck | Geslaagd | Geslaagd |
| repo:guard / agent:audit / brand:audit | Geslaagd | Geslaagd |
| Vitest | 77 bestanden / 624 tests | 81 bestanden / 649 tests geslaagd |
| Firestore + Storage | Niet als nulmeting uitgevoerd | 5 bestanden / 30 tests geslaagd, uitsluitend lokaal project `vvos-rules-test` |
| Productiebuild | Geslaagd | Geslaagd; bestaande Autoprefixer start/end-waarschuwingen |
| Lint | Interactieve Next-configuratie, geen werkende onbemande lintcheck | Niet geslaagd; bestaande PR #81 behandelt ESLint |
| Browser | Geen volledige stagingbasis | CarCheck-foutstatus op 390×844, 768 en 1280 breed; geen horizontale overflow |

Browserbeelden staan in `docs/qa/operational-reliability/`. Het betreft expliciete lokale demovoertuigen met ontbrekende Firebase-backend: fout zichtbaar, bediening geblokkeerd. Dit bewijst responsive foutafhandeling, niet een ingelogde staging-upload of complete browserketen. De centrale opslagketen is wel met echte lokale Firestore-emulator en synthetische records getest. Storage-regels zijn met echte lokale Storage-emulator getest; de volledige Admin-upload/downloadroute moet nog op staging met runtime-IAM worden gecontroleerd.

Bestaande import-, publicatie-, schema-, factuur-/dealbusiness- en consenttests blijven onderdeel van de regressiesuite. De geïntegreerde emulatorroute test publieke voertuigprojectie → aanvraag → falende notificatie → retry na verkoop → eigenaar/status/contact na herlezen. Import/publicatie worden aanvullend door bestaande afzonderlijke tests gedekt; er is geen complete browser/import/provider-E2E in staging uitgevoerd.

Read-only livecheck van de bestaande Merchant-feed en elf landingspagina's op 21 oktober slaagde (HTTP 200, prijzen/beschikbaarheid/schema/afbeeldings- en kilometerchecks volgens het bestaande script). Dit is bewijs van bestaande live inhoud, niet van deployment van deze patch. De huidige Merchant-CI-fout was `No module named 'scripts'`: checkout ontbrak. Lokaal voorbereid herstel voegt checkout en PYTHONPATH toe.

Geïnspecteerde bestaande CI: main quality run `39059188336` succesvol; Merchant run `39564698948` mislukt vóór inhoudelijke controle. Nieuwe branch heeft geen remote CI. Open PR-overlap: #95 VV Approved (leads/forms/rules/detailpagina), #93 foto's (regels/types), #81 lint (forms/management/package), #82 consent (public-site tests), #96 classificatie (voertuigdomein), #63 foto-diagnostiek (bestaande mislukte imagecheck). Hercontroleer vóór combineren; geen van deze PR's overgenomen of gewijzigd.

## Migratie, staging en rollback

Geen destructieve migratie vereist. Nieuwe collecties: `leadSubmissions`, `carCheckReports`, `vehicleCarChecks`, `carCheckEvidence`, `customerPortalTokens`, `dealPortalAccess` en bestaande audit-/CRM-collecties. Geen bestaande bedragen herinterpreteerd, geen historische ontbrekende data als nul ingevuld. Legacy rapporten uitsluitend na expliciet veld-/bewijsplan importeren.

1. Review patch en overlap op actuele main. Laat CI onder Node 22/npm 10.9.4 draaien; los lintconfiguratie via de bestaande lint-PR op.
2. Maak voor staging een afzonderlijke omgeving met eigen project/backend/Storage, geen productiecredentials. Deze repositoryconfiguratie noemt productiebackend `productie`; kopieer die niet blind naar staging. `.firebaserc` heeft geen impliciete default meer; elke opdracht vereist bewust project. Bevestig werkelijke runtime-identiteit en minst noodzakelijke toegang.
3. Configureer server/client beide Firebase, correcte staging-origin, auth vereist, erkende testrollen, geen demo. Laat portaal eerst uit. Verifieer private headers/noindex, revoked sessions, onbekende rol en ontbrekende/afwijkende Origin.
4. Rol eerst server-API's en bijbehorende UI uit, daarna aangescherpte regels. Test oude tabbladen: refresh vereist; geen tijdelijke brede rules als workaround. Neem vooraf een gecontroleerde backup van data en huidige regels/configuratie.
5. Importeer uitsluitend synthetisch voertuig met stabiel extern ID. Herhaal import, ontbrekende contentgroep, reserved/sold/delete en terugkeer A→B→A. Verifieer interne kosten/dealstatus behouden, bronfoto's in juiste volgorde, publicatievoorwaarden en privébestand nooit als voertuigfoto.
6. Open voertuigpagina, verstuur synthetische aanvraag met uitgeschakelde/testnotificatieprovider. Test netwerkretry, storage-uitval, exacte voertuigrelatie. Herlaad CRM; wijs eigenaar/deadline toe, log contact en status. Controleer met tweede bevoegde testgebruiker; workshop/marketing/anonymous moeten waar passend worden geweigerd.
7. Upload synthetisch inspectiebewijs, herlaad/lees met collega, test conflict, incomplete vrijgave, controle→vrijgave en nieuw concept na vrijgave. Verifieer publieke samenvatting en afwezigheid van privédata. Test inhoudstype, limiet, verkeerde voertuigrelatie, private download en runtime-IAM.
8. Controleer Morning Intelligence met ontbrekende inkoop/startdatum/deadline en Amsterdam-daggrens. Finance hoort zonder koppeling onbeschikbaar te zijn. Geen proefbetalingen of echte berichten.
9. Schakel alleen na akkoord beperkt portaal in; test verlopen, geroteerde en ingetrokken links. Controleer dat er geen analytics of externe widgets op privépagina's draaien.
10. Productie pas na expliciete goedkeuring, groene actuele CI, geslaagde stagingacceptatie, backup-/incidentverantwoordelijke en gecontroleerde provider-/secretconfiguratie. Na rollout afzonderlijk live verifiëren.

Rollback: portaalfeature uitzetten, nieuwe writes stoppen en gecontroleerde vorige appversie terugrollen indien noodzakelijk. Bewaar nieuwe inspectierevisies, audit, leads en toegangshistorie; verwijder geen collecties. Houd server-only regels behouden: een oudere client die directe SDK-toegang nodig heeft moet gesloten blijven of een compatibele server-API krijgen. Draai niet terug naar publiek leesbare voertuigdocumenten of demo-finance om functionaliteit te herstellen. Nieuwe code opnieuw uitrollen is veiliger wanneer de oude versie afhankelijk is van de gesloten toegang.

## Nog geblokkeerd / productievoorwaarden

- Geen geautoriseerde stagingruntime, rollenaccounts, werkelijke IAM- en uploadtest in deze opdracht gebruikt. Geen echte Google Chat-ontvangsttest uitgevoerd; aparte toestemming nodig voor berichten.
- Finance: administratie/provider, rekening-/btw-/margeregeling, factuurnummerreeks en correctiebeleid ontbreken als geverifieerd contract. Geen definitieve factuurboekhouding, bankreconciliatie of fiscale juistheid geclaimd. Bestaande commercieel-core centenmodellen blijven intact; bouw hierna adapter/idempotente providerverwerking op bestaande modellen, geen parallel grootboek.
- Legacy Storage-downloadtokens en bestaande openbare bestanden zijn niet ingetrokken. Nieuwe CarCheck-evidence gebruikt die niet. Inventariseer legacylinks vóór wijzigingen met klantimpact.
- Retentie en cleanup voor aanvraagmarkers, verlopen tokens en eventuele orphan evidence (bestand opgeslagen maar metadata mislukt) moeten operationeel worden vastgesteld. Niet automatisch verwijderen zonder bewaarbeleid.
- Vrije CarCheck-samenvatting heeft menselijke inhoudscontrole nodig; geen automatische detectie van alle persoonsgegevens/claims. Er is geen onafhankelijke tweede reviewer afgedwongen.
- Overige bestaande placeholdermodules, bijvoorbeeld werkplaats, zijn niet daardoor operationeel geworden. De oplevering betreft de beschreven keten; geen bewijs dat het gehele VVOS af is.
