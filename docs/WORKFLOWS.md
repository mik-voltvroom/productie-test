# Geautomatiseerde workflows

## Nieuwe auto
trigger: vehicle.created
1. RDW/VWE-data verrijken
2. verplichte velden valideren
3. foto-check uitvoeren
4. advertentietekst genereren
5. medewerker laat tekst en prijs goedkeuren
6. website publiceren
7. Merchant-data synchroniseren
8. marketingassets klaarzetten

## Nieuwe lead
trigger: lead.created
1. toestemming en contactgegevens valideren
2. bron en voertuig koppelen
3. intentie scoren
4. verantwoordelijke aanwijzen
5. binnen vijf minuten taak en eerste reactie genereren
6. na 24 uur herinneren indien geen contact

## Verkocht voertuig
trigger: vehicle.status=sold
1. website direct sluiten
2. Merchant-feed verwijderen
3. advertenties pauzeren
4. afleverchecklist starten
5. reviewflow plannen
