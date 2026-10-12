# Mobilox wegenbelasting — herstel 12 oktober 2026

## Oorzaak en bron

Hexon 2.25 definieert `motorrijtuigen_belasting` als zes afzonderlijke `prijzen`-velden:
`maand_min`, `maand_max`, `kwartaal_min`, `kwartaal_max`, `jaar_min`, `jaar_max`.
Elk bevat `prijs` met onder andere `bedrag` en `munteenheid`.
Officieel schema: https://eigenwebsite.dv.nl/docs/2.25/voertuig.xsd

De eerdere parser zocht generieke `min`/`max` en gebruikte bij ontbreken het eerste getal
onder de belastingnode. Hierdoor kon het maandminimum als beide kwartaalgrenzen worden
opgeslagen. De showroomkaart deelde dit daarna door drie.

## Gedrag na deze wijziging

- De website gebruikt uitsluitend de expliciete kwartaalgrenzen in eurocenten.
- De showroomkaart gebruikt de rechtstreeks aangeleverde maandgrenzen als beide geldig zijn.
  Alleen bij ontbrekende maandgrenzen rekent zij de geldige kwartaalgrenzen om, met toelichting.
- De import selecteert expliciet EUR. Lege, negatieve, omgekeerde of ambigue kwartaalgrenzen
  leveren geen belastingbedrag op. Expliciet nul blijft nul.
- Oudere `wegenbelasting_kwartaal`-aanleveringen blijven ondersteund.
- Oude moderne imports zonder `roadTax.schemaVersion: 2` worden niet meer als betrouwbare
  belastingbedragen getoond. Dit voorkomt foutieve bedragen tijdens de overgang.
- Processorversie `8-mobilox-road-tax-periods` zorgt dat een identieke opnieuw verstuurde XML
  eenmalig opnieuw wordt verwerkt. Daarna blijft dezelfde aanlevering idempotent.

## Productieafronding

Een deployment corrigeert bestaande Firestore-records niet vanzelf. De integratie bewaart
alleen payloadhashes en geen volledige XML om automatisch opnieuw af te spelen.

1. Controleer typecheck, gerichte tests, CI en build van deze wijziging.
2. Publiceer de geteste wijziging via de productie-repository.
3. Laat Mobilox eerst één bestaand voertuig volledig opnieuw aanleveren aan de bestaande koppeling.
   Gebruik de complete originele aanlevering, nooit een afgekapt bericht of een belasting-only XML.
4. Vergelijk de nieuwe kwartaal- en maandgrenzen met Mobilox, de openbare voertuigpagina en de showroomkaart.
5. Laat daarna de overige actieve voorraad opnieuw versturen en controleer de synchronisatieresultaten.

De gedeelde request was afgekapt vóór het belastingblok. De tests gebruiken daarom een synthetische
fixture op basis van het officiële schema, geen volledige productiepayload. Productiereadback
na opnieuw aanleveren blijft vereist. Neem geen authenticatieheaders op in fixtures, commits of logs.
