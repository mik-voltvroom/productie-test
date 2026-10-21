# Autopagina voor Google Voertuigadvertenties

## Uitgangspunten
Mobilox levert de Merchant Center-feed. Het account is volgens de eigenaar al toegelaten tot Voertuigadvertenties. De VVOS-verkoopprijs is volgens de eigenaar inclusief alle verplichte kosten. Deze wijziging maakt geen tweede feed en past de Mobilox-koppeling niet aan.

## Pagina
De autopagina toont de openbare VVOS-foto’s en geselecteerde tekst en opties. De all-in-prijs, beschikbaarheid, kilometerstand, bouwjaar en contact zijn direct zichtbaar. Lange beschrijvingen en opties zijn uitklapbaar. Niet-onderbouwde maandbedragen worden niet als financieringsaanbod getoond. Specificaties behouden uitsluitend beschikbare waarden. Car/Offer JSON-LD gebruikt dezelfde prijs en openbare afbeeldingen als de pagina; teksten zijn veilig geserialiseerd.

De route is expliciet dynamisch omdat publicatiegegevens per aanvraag worden opgehaald. De 500 op een live autopagina is waargenomen; zonder hostinglogs is de oorzaak niet bewezen. Na deployment moet de live route opnieuw gecontroleerd worden.

## Voor activering
Vergelijk in Merchant Center één Mobilox-aanbod met de exacte eind-URL: voertuig, prijs inclusief kosten, kilometerstand en beschikbaarheid. Controleer ook de vestigingscode en eventuele afwijkingen tussen Mobilox en handmatige VVOS-wijzigingen. Dit is een controle op echte accountgegevens, geen nieuwe feedimplementatie. Controleer de mobiele weergave en de live URL inclusief Google/Mobilox-queryparameters. Google-goedkeuring is niet geclaimd.

## Bronnen
https://support.google.com/google-ads/answer/11544533
https://support.google.com/google-ads/answer/15560833
