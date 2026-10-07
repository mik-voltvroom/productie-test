export type MarketingLanding = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  lead: string;
  promise: string;
  primary: { label: string; href: string; event?: string };
  secondary: { label: string; href: string };
  highlights: string[];
  sections: { title: string; text: string }[];
  steps: { title: string; text: string }[];
  faq: { question: string; answer: string }[];
  closingTitle: string;
  closingText: string;
};

export type KnowledgeArticle = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  lead: string;
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  sections: {
    title: string;
    paragraphs: string[];
    bullets?: string[];
  }[];
  relatedLanding: { label: string; href: string };
};

export const marketingLandings: Record<string, MarketingLanding> = {
  elektrisch: {
    slug: "elektrische-auto-kopen-groningen",
    title: "Elektrische auto kopen in Groningen | Volt & Vroom",
    description: "Een elektrische occasion kopen in Groningen? Vergelijk bereik, laden, historie en beschikbare accudata met persoonlijk advies van Volt & Vroom.",
    eyebrow: "Elektrische occasion kopen · Groningen",
    heading: "Een elektrische auto die past bij uw echte ritten.",
    lead: "Niet alleen kijken naar de opgegeven actieradius. Wij bespreken laadmogelijkheden, dagelijkse afstand, onderhoud en beschikbare accudata voordat u beslist.",
    promise: "U krijgt een controleerbaar verhaal bij de auto én advies dat aansluit op uw gebruik.",
    primary: { label: "Bekijk elektrische occasions", href: "/#voorraad" },
    secondary: { label: "Doe de keuzehulp", href: "/keuzehulp" },
    highlights: ["Beschikbare accudata in context", "Historie en techniek beoordeeld", "Advies over laden en praktijkbereik"],
    sections: [
      { title: "Begin bij uw gebruik, niet bij het grootste bereik", text: "Voor woon-werkverkeer, gezinsritten en langere reizen gelden verschillende eisen. We leggen uw dagelijkse kilometers, vaste laadmogelijkheden en langere ritten naast de eigenschappen van de auto." },
      { title: "Vraag wat de accu-informatie werkelijk zegt", text: "Een State of Health kan nuttig zijn, maar blijft één meetmoment. Wanneer betrouwbare accudata beschikbaar is, tonen we die met uitleg over meetmethode, leeftijd en relevante voertuigcontext." },
      { title: "Controleer meer dan de aandrijflijn", text: "Ook banden, remmen, onderstel, onderhoud, schadeverleden, software en laadapparatuur bepalen of een elektrische occasion een verstandige aankoop is." },
    ],
    steps: [
      { title: "Vertel hoe u rijdt", text: "Dagelijkse afstand, langere ritten, laadplek en budget." },
      { title: "Vergelijk geschikte auto’s", text: "Bereik, laden, historie, techniek en beschikbare accudata." },
      { title: "Rijd en beslis", text: "Een proefrit en heldere uitleg, zonder druk." },
    ],
    faq: [
      { question: "Hoeveel bereik heb ik nodig?", answer: "Dat hangt af van uw normale ritten, laadmogelijkheden en hoe vaak u lange afstanden rijdt. Een passende laadroutine is vaak belangrijker dan het hoogste bereik op papier." },
      { question: "Is een hoge kilometerstand bij een elektrische auto een probleem?", answer: "Niet automatisch. Onderhoud, gebruik, laadgedrag, accustaat en algemene voertuigconditie geven samen een beter beeld dan de kilometerstand alleen." },
      { question: "Kan ik zonder eigen laadpaal elektrisch rijden?", answer: "Dat kan, maar vraagt een betrouwbare laadmogelijkheid in de buurt of op het werk. We bespreken bereikbaarheid, tarieven en uw weekritme voordat we adviseren." },
      { question: "Tonen jullie altijd een accutest?", answer: "Nee. We tonen accudata wanneer die betrouwbaar beschikbaar is en benoemen duidelijk wanneer informatie ontbreekt. Een getal zonder herkomst of context presenteren we niet als zekerheid." },
    ],
    closingTitle: "Elektrisch rijden moet in uw week passen.",
    closingText: "Vertel ons hoe u rijdt en waar u kunt laden. Dan vergelijken we alleen auto’s die daar logisch bij aansluiten.",
  },
  hybride: {
    slug: "hybride-auto-kopen-groningen",
    title: "Hybride auto kopen in Groningen | Volt & Vroom",
    description: "Een hybride occasion kopen in Groningen? Ontdek het verschil tussen full hybrid en plug-inhybride en krijg advies op basis van uw ritten en laadmogelijkheden.",
    eyebrow: "Hybride occasion kopen · Groningen",
    heading: "Hybride wanneer het voordeel ook in de praktijk klopt.",
    lead: "Full hybrid en plug-inhybride vragen om een ander gebruik. Wij maken het verschil helder en kijken welke techniek past bij uw ritten, laadmogelijkheden en verwachtingen.",
    promise: "Geen algemene voorkeur voor een aandrijflijn, maar een onderbouwde keuze voor uw situatie.",
    primary: { label: "Bekijk hybride occasions", href: "/#voorraad" },
    secondary: { label: "Vergelijk met de keuzehulp", href: "/keuzehulp" },
    highlights: ["Full hybrid en plug-in helder uitgelegd", "Praktijkgebruik boven foldercijfers", "Onderhoud en systeemwerking beoordeeld"],
    sections: [
      { title: "Full hybrid: laden tijdens het rijden", text: "Een full hybrid hoeft niet aan een laadpaal. De elektrische ondersteuning kan vooral in stad en regio prettig zijn, maar het resultaat hangt af van route, snelheid en rijstijl." },
      { title: "Plug-inhybride: alleen logisch als u laadt", text: "Een plug-inhybride kan dagelijkse ritten deels elektrisch afleggen. Zonder regelmatig laden draagt de grotere accu vooral extra gewicht mee. Daarom bespreken we uw laadmogelijkheid vooraf." },
      { title: "Bekijk het complete systeem", text: "Naast motor en transmissie letten we op onderhoud, storingshistorie, elektrische ondersteuning, laadfunctie waar van toepassing en bekende modelaandachtspunten." },
    ],
    steps: [
      { title: "Breng uw ritten in kaart", text: "Stad, snelweg, jaarafstand en langere reizen." },
      { title: "Kies het juiste type hybride", text: "Full hybrid of plug-in op basis van echt gebruik." },
      { title: "Controleer de specifieke auto", text: "Historie, techniek, onderhoud en relevante accudata." },
    ],
    faq: [
      { question: "Wat is het verschil tussen full hybrid en plug-inhybride?", answer: "Een full hybrid laadt de kleine accu tijdens het rijden en hoeft niet aan de stekker. Een plug-inhybride heeft een grotere accu die u extern laadt en kan meer kilometers elektrisch rijden." },
      { question: "Is een plug-inhybride zuinig zonder laden?", answer: "Het beoogde voordeel wordt meestal kleiner wanneer u niet regelmatig laadt. Uw ritlengte en laadritme bepalen daarom of een plug-inhybride logisch is." },
      { question: "Past een hybride bij veel snelwegkilometers?", answer: "Dat verschilt per type en model. Bij lange, constante snelwegritten is de elektrische ondersteuning vaak anders van waarde dan bij stadsverkeer. We vergelijken daarom op uw routeprofiel." },
      { question: "Wat controleren jullie bij een hybride occasion?", answer: "We beoordelen de beschikbare onderhouds- en storingshistorie, de algemene technische staat en de werking van relevante hybridefuncties. Ontbrekende informatie benoemen we." },
    ],
    closingTitle: "De juiste hybride begint met de juiste vraag.",
    closingText: "Niet ‘welke hybride is populair?’, maar ‘welke techniek past bij mijn ritten?’ Daar helpen we u persoonlijk bij.",
  },
  inruilen: {
    slug: "auto-inruilen-groningen",
    title: "Auto inruilen in Groningen | Persoonlijke indicatie",
    description: "Uw auto inruilen in Groningen? Vraag bij Volt & Vroom een persoonlijke indicatie aan op basis van kenteken, kilometerstand, onderhoud, uitvoering en staat.",
    eyebrow: "Auto inruilen · Groningen",
    heading: "Een inruilindicatie op basis van uw specifieke auto.",
    lead: "Kenteken en kilometerstand zijn het begin. Onderhoud, uitvoering, staat, schade en foto’s maken het beeld completer. Daarom beoordeelt Volt & Vroom iedere aanvraag persoonlijk.",
    promise: "U ontvangt een onderbouwde indicatie; de definitieve waarde volgt na controle van de auto.",
    primary: { label: "Start mijn inruilaanvraag", href: "/inruilen" },
    secondary: { label: "Bekijk actuele voorraad", href: "/#voorraad" },
    highlights: ["RDW-gegevens als startpunt", "Persoonlijke beoordeling", "Geen verplichting om te verkopen"],
    sections: [
      { title: "Meer dan een automatisch kentekenbod", text: "Twee auto’s van hetzelfde bouwjaar kunnen sterk verschillen door uitvoering, onderhoud, gebruik en staat. Daarom vragen we informatie die bij uw specifieke auto hoort." },
      { title: "Foto’s helpen om vooraf duidelijker te zijn", text: "Beelden van buitenkant, interieur, kilometerstand en eventuele beschadigingen helpen om verrassingen bij de uiteindelijke beoordeling te beperken." },
      { title: "De definitieve waarde volgt na controle", text: "Een online aanvraag blijft een indicatie. Pas wanneer voertuig, documenten en staat zijn gecontroleerd kan de definitieve inruilwaarde worden vastgesteld." },
    ],
    steps: [
      { title: "Controleer het kenteken", text: "We halen beschikbare openbare voertuiggegevens op." },
      { title: "Beschrijf de staat", text: "Kilometerstand, onderhoud, sleutels, opties en foto’s." },
      { title: "Ontvang persoonlijk contact", text: "Mik bespreekt de indicatie en mogelijke vervolgstap." },
    ],
    faq: [
      { question: "Is de online indicatie een definitief bod?", answer: "Nee. De gegevens geven een eerste beeld. De definitieve waarde volgt nadat de auto, documenten en opgegeven staat zijn gecontroleerd." },
      { question: "Kan ik ook inruilen zonder direct een andere auto te kiezen?", answer: "U kunt de aanvraag alvast indienen en uw situatie toelichten. Daarna bespreken we persoonlijk wat een passende vervolgstap is." },
      { question: "Welke foto’s zijn nuttig?", answer: "Een duidelijk totaalbeeld van voor-, achter- en zijkanten, interieur, kilometerstand en eventuele beschadigingen helpt bij de eerste beoordeling." },
      { question: "Ben ik verplicht om na de aanvraag te verkopen?", answer: "Nee. Een aanvraag verplicht u niet tot verkoop of aankoop." },
    ],
    closingTitle: "Vertel eerlijk hoe de auto ervoor staat.",
    closingText: "Hoe vollediger de informatie, hoe beter we vooraf kunnen uitleggen waarop de indicatie is gebaseerd.",
  },
};

export const knowledgeArticles: KnowledgeArticle[] = [
  {
    slug: "elektrische-occasion-kopen-controlepunten",
    title: "Elektrische occasion kopen: 7 controlepunten vóór u beslist",
    description: "Waar let u op bij een gebruikte elektrische auto? Zeven praktische controlepunten voor accu, bereik, laden, historie, banden, software en proefrit.",
    eyebrow: "Koopgids · Elektrisch",
    lead: "Een elektrische occasion vraagt niet per se om méér twijfel, wel om andere vragen. Met deze zeven controlepunten vergelijkt u auto’s op informatie die in dagelijks gebruik verschil maakt.",
    readTime: "7 minuten",
    publishedAt: "2026-09-04",
    updatedAt: "2026-09-04",
    sections: [
      { title: "1. Begin met uw normale week", paragraphs: ["Schrijf op hoeveel kilometer u op een gewone dag rijdt, waar de auto stilstaat en welke langere ritten regelmatig terugkomen. Zo voorkomt u dat u alleen op de hoogste actieradius selecteert.", "Kijk ook naar laden. Een vaste plek thuis of op het werk maakt elektrisch rijden vaak eenvoudiger. Zonder vaste laadplek zijn bereikbaarheid, beschikbaarheid en prijs van publieke laders onderdeel van de keuze."] },
      { title: "2. Vergelijk bruikbare actieradius, niet alleen de fabrieksopgave", paragraphs: ["De opgegeven actieradius is een gestandaardiseerde vergelijkingswaarde. In de praktijk hebben temperatuur, snelheid, wind, banden, belading en verwarming invloed.", "Vraag daarom welk bereik realistisch is voor uw belangrijkste ritten en houd marge voor omstandigheden waarin verbruik hoger ligt."] },
      { title: "3. Beoordeel beschikbare accudata in context", paragraphs: ["Een State of Health kan inzicht geven in de resterende accucapaciteit, maar de meetmethode en omstandigheden zijn belangrijk. Een percentage zonder herkomst is geen volledig oordeel.", "Vraag wie de meting heeft uitgevoerd, wanneer dat gebeurde en welke aanvullende storings- of diagnosegegevens beschikbaar zijn. Ontbreekt een meting, laat dan duidelijk uitleggen welke controles wel zijn gedaan."] },
      { title: "4. Controleer laden en meegeleverde accessoires", paragraphs: ["Bekijk de maximale AC- en DC-laadsnelheid van het specifieke model en let op het verschil tussen een piekwaarde en de laadcurve. Voor thuisladen is het laadvermogen via wisselstroom vaak relevanter dan de hoogste snellaadpiek.", "Controleer de laadpoort, probeer indien mogelijk een laadsessie en inventariseer welke kabels, adapters of mobiele lader bij de auto horen."] },
      { title: "5. Vergeet de gewone autotechniek niet", paragraphs: ["Een elektrische auto heeft minder traditionele motoronderdelen, maar banden, remmen, onderstel, airconditioning en carrosserie blijven belangrijk. Het directe koppel en voertuiggewicht kunnen de bandenslijtage beïnvloeden.", "Controleer onderhoud, schadeverleden, bandenmaat en gelijkmatige slijtage. Luister tijdens de proefrit naar bijgeluiden en test remgevoel, klimaatregeling en rijhulpsystemen."] },
      { title: "6. Bekijk software, garantie en eigenaarsfuncties", paragraphs: ["Controleer of software-updates zijn uitgevoerd en of navigatie, laadplanning, app-koppeling en beide sleutels werken. Vraag welke voertuig- en accugarantie nog geldt en welke voorwaarden daarbij horen.", "Laat accounts van vorige gebruikers verwijderen en zorg dat de auto na levering aan uw eigen account kan worden gekoppeld."] },
      { title: "7. Maak de totale vergelijking", paragraphs: ["Vergelijk aanschaf, verzekering, verwachte afschrijving, banden, onderhoud en laden. Gebruik uw eigen laadmogelijkheden en kilometers in plaats van één algemeen rekenvoorbeeld.", "Een passende elektrische occasion is niet automatisch de auto met het grootste bereik of de laagste prijs. De beste keuze is de auto waarvan gebruik, techniek en informatie samen kloppen."], bullets: ["Dagelijkse ritten en langste terugkerende route", "Praktijkbereik met voldoende marge", "Herkomst en context van accudata", "AC-laden, snelladen en laadkabels", "Onderhoud, banden, remmen en schadeverleden", "Software, sleutels, app en resterende garantie"] },
    ],
    relatedLanding: { label: "Bekijk onze aanpak voor elektrische occasions", href: "/elektrische-auto-kopen-groningen" },
  },
  {
    slug: "soh-accu-elektrische-auto-uitleg",
    title: "SOH van een elektrische auto: wat zegt accugezondheid?",
    description: "State of Health bij een elektrische auto uitgelegd: wat het percentage kan zeggen, waarom meetmethoden verschillen en welke vragen u bij een occasion stelt.",
    eyebrow: "Uitleg · Accugezondheid",
    lead: "SOH staat voor State of Health en wordt vaak als één percentage weergegeven. Dat is nuttige informatie, zolang u weet wat er is gemeten en wat het getal niet vertelt.",
    readTime: "6 minuten",
    publishedAt: "2026-09-04",
    updatedAt: "2026-09-04",
    sections: [
      { title: "Wat betekent State of Health?", paragraphs: ["State of Health beschrijft doorgaans hoe de huidige bruikbare accucapaciteit zich verhoudt tot een referentie toen de accu nieuw was. De precieze berekening verschilt per fabrikant, diagnosemethode en databron.", "Een SOH van een bepaald percentage is daarom niet zonder meer één-op-één te vergelijken tussen verschillende merken of meetmethoden."] },
      { title: "Waarom neemt accucapaciteit af?", paragraphs: ["Lithium-ionaccu’s verouderen door tijd, temperatuur, gebruik en laadcycli. Dat proces is normaal. Hoe snel capaciteit afneemt, hangt onder meer af van accutype, temperatuurmanagement, laadgedrag en gebruiksomstandigheden.", "Een lagere capaciteit kan het beschikbare rijbereik verkleinen, maar zegt niet automatisch dat de accu defect is."] },
      { title: "Waarom kan een meting verschillen?", paragraphs: ["Sommige rapporten lezen waarden uit het batterijmanagementsysteem, andere gebruiken een rit- of laadtest. Temperatuur, laadniveau, recente ritten en software kunnen de uitkomst beïnvloeden.", "Vraag daarom altijd naar datum, meetmethode en uitvoerende partij. Een rapport met context is waardevoller dan alleen een los percentage in een advertentie."] },
      { title: "Wat zegt SOH niet?", paragraphs: ["SOH vertelt niet alles over storingen, celbalans, laadgedrag, snellaadprestaties of de staat van de rest van de auto. Ook actieradius wordt beïnvloed door weer, snelheid, banden en klimaatregeling.", "Gebruik SOH als onderdeel van een bredere technische en praktische beoordeling, niet als enig koopcriterium."] },
      { title: "Welke vragen stelt u bij een occasion?", paragraphs: ["Vraag welke accudata beschikbaar is, hoe die is verkregen en of er relevante foutcodes of werkzaamheden bekend zijn. Controleer daarnaast laadfunctie, praktijkverbruik, resterende garantie en softwarestatus."], bullets: ["Wie heeft gemeten en wanneer?", "Welke methode en referentiewaarde zijn gebruikt?", "Zijn storingen of reparaties aan het hoogvoltsysteem bekend?", "Hoe presteert AC- en DC-laden?", "Welke accugarantie geldt nog en onder welke voorwaarden?"] },
      { title: "Onze benadering", paragraphs: ["Volt & Vroom toont accudata wanneer die betrouwbaar beschikbaar is en plaatst de informatie in de context van model, leeftijd en gebruik. Wanneer gegevens ontbreken, benoemen we dat liever dan een schijnzekerheid te geven."] },
    ],
    relatedLanding: { label: "Elektrische auto’s vergelijken op uw gebruik", href: "/elektrische-auto-kopen-groningen" },
  },
  {
    slug: "hybride-of-elektrisch-wat-past-bij-mij",
    title: "Hybride of elektrisch: wat past bij uw ritten?",
    description: "Hybride of elektrisch kiezen? Vergelijk laadmogelijkheid, dagelijkse afstand, lange ritten, gebruiksgemak en techniek met een praktisch besliskader.",
    eyebrow: "Keuzehulp · Aandrijflijn",
    lead: "De beste aandrijflijn volgt niet uit een trend, maar uit uw week. Wie kan laden, voorspelbare ritten maakt en de auto passend kiest, komt vaak tot een andere uitkomst dan iemand die veel onverwachte lange afstanden rijdt.",
    readTime: "7 minuten",
    publishedAt: "2026-09-04",
    updatedAt: "2026-09-04",
    sections: [
      { title: "Begin met drie vragen", paragraphs: ["Kunt u thuis of op het werk regelmatig laden? Hoeveel kilometer rijdt u op een normale dag? En hoe vaak maakt u ritten die duidelijk langer zijn?", "Deze vragen geven richting, maar ook budget, aanhangergebruik, beschikbare modellen en persoonlijke voorkeur tellen mee."] },
      { title: "Wanneer elektrisch vaak logisch is", paragraphs: ["Elektrisch past vaak goed wanneer laden structureel mogelijk is en dagelijkse ritten ruim binnen het realistische bereik vallen. De stille aandrijving en directe respons zijn voor veel bestuurders belangrijke voordelen.", "Voor langere reizen zijn laadplanning, snellaadcurve en netwerk langs uw routes relevanter dan alleen de maximale laadsnelheid op papier."] },
      { title: "Wanneer full hybrid vaak logisch is", paragraphs: ["Een full hybrid kan aantrekkelijk zijn wanneer u niet extern wilt of kunt laden en veel wisselende stads- en regioritten maakt. De auto regelt de elektrische ondersteuning zelf.", "Het daadwerkelijke verbruik blijft afhankelijk van model, route, snelheid en rijstijl. Een full hybrid is geen elektrische auto met een kleine accu, maar een eigen technische keuze."] },
      { title: "Wanneer een plug-inhybride past", paragraphs: ["Een plug-inhybride is vooral logisch wanneer u hem regelmatig laadt en veel dagelijkse ritten elektrisch kunt afleggen, terwijl een brandstofmotor flexibiliteit geeft voor langere afstanden.", "Wie nauwelijks laadt, benut een belangrijk deel van het systeem niet. Bespreek daarom eerlijk hoe vaak de auto aan de stekker zal staan."] },
      { title: "Vergelijk op totaal gebruik", paragraphs: ["Maak een vergelijking op basis van aanschaf, verzekering, onderhoud, banden, energie of brandstof en verwachte afschrijving. Algemene rekenvoorbeelden kunnen richting geven, maar uw eigen kilometers en laadprijs bepalen de bruikbaarheid.", "Let bij iedere occasion daarnaast op historie, technische staat en beschikbare accu-informatie. De aandrijflijn kan passend zijn terwijl een specifieke auto dat niet is."] },
      { title: "Een eenvoudig besliskader", paragraphs: ["Gebruik deze punten als start voor een gesprek en proefrit, niet als automatische uitkomst."], bullets: ["Structureel laden en voorspelbare ritten: onderzoek elektrisch", "Niet laden en veel stad/regio: vergelijk full hybrids", "Regelmatig laden plus incidenteel lange ritten: beoordeel plug-inhybride kritisch", "Veel onvoorspelbare kilometers: geef bereik en tank- of laadgemak extra gewicht", "Altijd: controleer de specifieke auto, niet alleen het type aandrijving"] },
    ],
    relatedLanding: { label: "Doe de persoonlijke Hybrid & EV Match", href: "/keuzehulp" },
  },
];

export function getArticle(slug: string) {
  return knowledgeArticles.find((article) => article.slug === slug);
}
