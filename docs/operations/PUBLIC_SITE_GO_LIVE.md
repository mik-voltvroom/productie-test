# Openbare website livegang — www.voltvroom.nl

Status: voorbereid, nog niet gepubliceerd  
Scope: openbare marketingwebsite en leadformulieren  
Buiten scope van de eerste livegang: dashboard, finance, betalingen, klantportaal en onbevestigde provideracties

## Veilig uitgangspunt

- Promoveer exact de op staging geaccepteerde commit-SHA naar een aparte private productierepository.
- Gebruik Firebase-project `voltvroom-productie` met een eigen App Hosting-backend, webapp, runtime identity, database, opslag en secrets.
- Activeer geen stagingconfiguratie of stagingsecret in productie.
- Publiceer handmatig na eigenaar-goedkeuring; koppel pas later automatische productie-rollouts.
- Houd `VVOS_REQUIRE_AUTH=true` en `VVOS_DATA_MODE=firebase`.

## Wat vooraf beschikbaar moet zijn

- [ ] Private productierepository met eigenaar-review en beschermde `main`.
- [ ] Toegang tot Firebase-project `voltvroom-productie` en actieve billing.
- [ ] Production Firebase Web App en App Hosting-backend in `europe-west4`.
- [ ] Onafhankelijke production secrets in Secret Manager:
  - `CRON_SECRET`
  - `VWE_WEBHOOK_SECRET`
  - `HEXON_SYNC_USERNAME`
  - `HEXON_SYNC_PASSWORD`
  - `PORTAL_TOKEN_SECRET`
  - `AUDIT_HASH_SALT`
- [ ] Runtime service identity heeft per secret alleen Secret Accessor.
- [ ] Eigenaaraccount met MFA en gecontroleerde `{ role: "owner" }` custom claim.
- [ ] Firestore-indexes, Firestore Rules en Storage Rules gepubliceerd en getest.
- [ ] Back-up, herstel, monitoring en rollback-eigenaar vastgelegd.
- [ ] Contactgegevens, privacytekst, cookiegebruik en formuliertoestemming goedgekeurd.

## Productieconfiguratie

1. Kopieer de goedgekeurde staging-snapshot naar de private productierepository.
2. Gebruik `docs/operations/apphosting.production.yaml.example` als basis voor de actieve `apphosting.yaml`.
3. Vervang alle `replace-with-production-*` waarden met de publieke clientconfig van de production Firebase Web App.
4. Voeg overige providercredentials pas toe nadat de betreffende koppeling afzonderlijk in productie is goedgekeurd.
5. Voer met de productieomgeving uit:
   - `npm ci`
   - `npm run check`
   - `npm run validate:env`
   - `npm run readiness`
6. Leg release-SHA en laatst bekende gezonde rollback-SHA vast.

## Openbare-site smokecheck vóór DNS

- [ ] Homepage, voorraad, kennisbank, artikelen, inruilen en keuzehulp geven 200.
- [ ] Contact-, keuzehulp- en inruilformulier slaan één testlead correct op.
- [ ] Uploads accepteren alleen toegestane typen en groottes.
- [ ] Dashboard en interne API zonder sessie geven redirect of 401.
- [ ] Portal zonder geldige token en hooks zonder geldig secret falen gesloten.
- [ ] `/api/health`, `/robots.txt` en `/sitemap.xml` zijn correct.
- [ ] Canonicals en Open Graph verwijzen naar `https://www.voltvroom.nl`.
- [ ] Mobiel en desktop hebben geen horizontale overflow.
- [ ] Telefoon-, WhatsApp-, e-mail- en routeknoppen openen de juiste bestemming.
- [ ] Er staat geen demo- of stagingdata op publieke routes.

## DNS-overgang

DNS-snapshot van 4 september 2026:

- `voltvroom.nl A 109.71.54.105`
- `www.voltvroom.nl CNAME voltvroom.nl`
- nameservers staan bij YourWebhoster
- bestaande MX-records worden niet gewijzigd

Uitvoering:

1. Voeg `www.voltvroom.nl` in Firebase App Hosting toe als primair custom domain.
2. Stel `voltvroom.nl` in als redirect naar `https://www.voltvroom.nl`.
3. Neem uitsluitend de door Firebase getoonde verificatie- en routeringsrecords over.
4. Verwijder conflicterende oude A/AAAA/CNAME-records pas bij de afgesproken omschakeling.
5. Laat MX-, SPF-, DKIM- en DMARC-records ongemoeid.
6. Wacht tot Firebase zowel het domein als SSL als connected toont.
7. Herhaal de smokecheck op beide hostnamen en controleer de 301-redirect naar `www`.

## Direct na livegang

- [ ] Search Console-property en sitemap indienen.
- [ ] Analytics/consent alleen activeren na goedkeuring.
- [ ] Monitoring op 5xx, leadfouten en healthcheck activeren.
- [ ] Eerste echte lead end-to-end controleren zonder klantdata in logs te zetten.
- [ ] Release-SHA, tijdstip, DNS-wijziging en rollback-SHA registreren.

## Stopcriteria

Niet publiceren wanneer één van deze punten geldt:

- productionconfig bevat `staging` of placeholders;
- een verplichte readinesscheck is rood;
- een openbaar formulier kan geen lead opslaan;
- interne gegevens zijn zonder sessie bereikbaar;
- er is geen werkende rollback;
- DNS- of Firebase-toegang is niet onder controle van de eigenaar.
