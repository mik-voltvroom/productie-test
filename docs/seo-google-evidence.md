# Externe Google-controle — 17 oktober 2026

Dit is een gedateerde productieobservatie, geen automatische koppeling in VVOS en geen resultaatmeting van deze PR. Tests/CI gebruiken geen Google of live voorraad. Screenshots en oorspronkelijke zichtbare rapportteksten zijn lokaal geleverd, niet naar GitHub geüpload.

## Search Console

Na expliciete toestemming is de URL-prefixproperty `https://www.voltvroom.nl/` toegevoegd. Google verifieerde het eigendom automatisch via de reeds aanwezige domeinnaamproviderverificatie. Er zijn geen DNS-records, toegangsrechten of verificatietags gewijzigd.

Het nieuwe property-overzicht meldt dat prestaties, indexeringsaggregaten en functionaliteitsrapporten nog worden verwerkt. Er zijn daarom geen klikken, vertoningen, totale indexaantallen of Core Web Vitals-resultaten vastgesteld. De afzonderlijke URL-inspecties leveren al wel Google-indexbewijs:

| Gecontroleerde URL | Google-status | Laatste crawl volgens Google | Aangegeven canonical | Google-canonical |
| --- | --- | --- | --- | --- |
| `/` | Geïndexeerd | 16 oktober 2026, 14:22:16 | `https://www.voltvroom.nl/` | Gecontroleerde URL |
| `/voorraad` | Geïndexeerd | 7 oktober 2026, 18:21:47 | `https://www.voltvroom.nl/voorraad` | Gecontroleerde URL |
| Land Rover Velar, voorraad-ID 56821730 | Geïndexeerd | 7 oktober 2026, 13:20:25 | Geen in deze historische crawl | Gecontroleerde URL |

Alle drie tonen Googlebot smartphone, crawl toegestaan, ophalen geslaagd en indexering toegestaan. De inspecties melden "Geen verwijzende sitemaps gevonden". Dat bewijst niet dat de huidige sitemap ontbreekt. De ontbrekende aangegeven canonical bij de oude voertuigcrawl bewijst evenmin dat de huidige pagina die mist. Er is geen indexeringsverzoek of sitemap ingediend.

Bron: [Search Console-property](https://search.google.com/search-console?resource_id=https%3A%2F%2Fwww.voltvroom.nl%2F). De afgeschermde inspecties vereisen de bestaande accounttoegang. VVOS heeft hiermee nog geen Search Console API-credentials; het dashboard blijft terecht aangeven dat de rapportkoppeling niet is gemaakt.

## PageSpeed Insights — externe Lighthouse-labmetingen

Google-webinterface, Lighthouse 13.5.0, 17 oktober 2026 tussen 13:46 en 13:53 CEST. Mobiel: geëmuleerde Moto G Power, langzame 4G, eerste paginalaad. Desktop gebruikt de eigen desktopemulatie. Dit zijn losse labruns; waarden variëren. De onderstaande tijden zijn de afgeronde zichtbare rapportwaarden.

| Pagina | Apparaat | Performance | LCP | TBT | CLS | Toegankelijkheid | SEO |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Homepage | Mobiel | 62 | 9,3 s | 30 ms | 0,077 | 93 | 100 |
| Homepage | Desktop | 81 | 1,8 s | 170 ms | 0,020 | 93 | 100 |
| Voorraad | Mobiel | 60 | 9,4 s | 100 ms | 0 | 93 | 100 |
| Voorraad | Desktop | 97 | 0,8 s | 140 ms | 0,016 | 93 | 100 |
| Land Rover Velar | Mobiel | 64 | 7,6 s | 60 ms | 0,038 | 93 | 100 |
| Land Rover Velar | Desktop | 66 | 1,3 s | 900 ms | 0,086 | 93 | 100 |

Google toont bij alle drie "Geen gegevens" bij echte gebruikerservaring. Er is geen CrUX-/INP-meting of geslaagd Core Web Vitals-oordeel vastgesteld. TBT is een labmaat en wordt niet als INP gepresenteerd. De SEO-score 100 betreft geautomatiseerde Lighthouse-controles, geen ranking, volledige schemavalidatie of rich-resultgarantie.

Herleidbare publieke rapporten, elk met mobiel- en desktoptab:

- [Homepage](https://pagespeed.web.dev/analysis/https-www-voltvroom-nl/fqmhx658ui?form_factor=mobile)
- [Voorraad](https://pagespeed.web.dev/analysis/https-www-voltvroom-nl-voorraad/c6cqei3ivo?form_factor=mobile)
- [Land Rover Velar](https://pagespeed.web.dev/analysis/https-www-voltvroom-nl-voorraad-land-rover-range-rover-velar-2-0-p400e-awd-dynamic-hse-phev-2023-56821730/h7c71iqx3v?form_factor=mobile)

De rapporten geven als belangrijkste kansen beeldlevering/cachelevensduur en renderblokkerende requests. Op mobiel wordt circa 1.087 KiB beeldbesparing voor de homepage, 1.086 KiB voor voorraad en 10.823 KiB voor het voertuig genoemd. Op het voertuigdesktoprapport valt 900 ms TBT op. Toegankelijkheid meldt onder meer contrast en een iframe zonder titel. Dit zijn diagnoses voor gericht brononderzoek; deze PR wijzigt geen fotoselectie, providerbeelden, GTM of styling op basis van alleen deze schattingen. Prioriteit: eerst het LCP-element en het daadwerkelijke beeld-/requestpad vaststellen, daarna één gerichte verbetering vergelijken met dezelfde meetopzet en gelijke content.

Eén publieke API-aanvraag zonder sleutel gaf HTTP 429 wegens gedeeld dagquotum. Er zijn geen automatische retries of sleutels aangemaakt. De webinterface leverde wel bovenstaande rapporten. [Google documenteert](https://developers.google.com/speed/docs/insights/v5/get-started) gebruik met/zonder sleutel, quota en het onderscheid tussen Lighthouse en gebruikersdata. Eventuele vervolgautomatisering blijft server-side, expliciet gestart, begrensd en gedateerd; geen crawler per dashboardbezoek, OAuth-systeem of achtergrondjob toegevoegd.
