# VVOS Voertuigrapport – Mobile Vehicle Check MVP

## Doel
Een mobiele voertuigcheck voor Volt & Vroom waarmee medewerkers op locatie een auto technisch en visueel inspecteren en automatisch een uniform VVOS Voertuigrapport genereren.

## Kernflow
1. Nieuw voertuig openen via kenteken/VIN of bestaande VVOS-voorraad.
2. Basisgegevens ophalen of handmatig vastleggen.
3. OBD/BLE-adapter koppelen.
4. Technische scan uitvoeren.
5. Hybride/EV batterijcontrole uitvoeren waar voertuigprofiel dit ondersteunt.
6. Visuele inspectie en proefrit uitvoeren.
7. Foto's en opmerkingen vastleggen.
8. Bevindingen laten samenvatten en classificeren.
9. VVOS Voertuigrapport genereren.
10. Rapport koppelen aan voertuig-ID in VVOS.

## Rapportonderdelen
- Voertuigidentiteit: kenteken, VIN, merk, model, uitvoering, bouwjaar, tellerstand.
- Inspecteur, datum, locatie en rapport-ID.
- OBD-status: beschikbare ECU's, actieve DTC's, pending DTC's, historische DTC's, freeze-frame waar beschikbaar.
- Live data: 12V spanning, koelvloeistoftemperatuur, laad-/brandstofdata, relevante sensoren.
- Hybride/EV: HV-accutype, SOC, SOH indien betrouwbaar beschikbaar, celspanningsspreiding, temperatuurspreiding, laadcycli indien ondersteund, foutcodes BMS.
- Motor/aandrijflijn: stationair gedrag, transmissie, lekkages, geluiden, vloeistoffen.
- Onderstel/remmen/banden: profieldiepte, slijtagebeeld, remmen, ophanging.
- Carrosserie/interieur: schade, lak, glas, verlichting, comfortfuncties.
- Proefrit: acceleratie, remmen, stuurgedrag, trillingen, ADAS-waarschuwingen.
- Foto's: rondom, interieur, tellerstand, banden, eventuele schades, laadpoort/motorruimte.
- Risicoclassificatie: groen / aandacht / afkeur.
- Hersteladvies en indicatieve werkplaatsacties.
- Eindbeoordeling: geschikt voor inkoop, geschikt onder voorwaarden, niet inkopen.

## Technische architectuur
### Mobile
- React Native + TypeScript.
- iOS en Android.
- BLE-laag voor ondersteunde OBD-adapters.
- Offline-first inspectie: lokale opslag en latere sync.
- Camera-integratie en verplichte fotolijst.

### OBD-laag
- Generieke ELM327-compatible commando's voor basis OBD-II.
- Merk/model-specifieke profielen voor uitgebreide PIDs en UDS-data.
- Adapter abstraction zodat later professionele interfaces toegevoegd kunnen worden.
- Geen SOH tonen als de bron niet gevalideerd is. Gebruik dan: 'SOH niet rechtstreeks beschikbaar' plus beschikbare batterij-indicatoren.

### Backend/VVOS
- VehicleInspection als eigen domeinobject gekoppeld aan vehicleId.
- Raw scan data onveranderd bewaren voor auditbaarheid.
- Normalized measurements apart opslaan.
- PDF/HTML rapport renderen vanaf een immutable inspection snapshot.
- Versienummer op inspectieprotocol en voertuigprofiel.

## Datamodel (concept)
```ts
type VehicleInspection = {
  id: string;
  vehicleId: string;
  status: 'draft' | 'scanning' | 'review' | 'final';
  protocolVersion: string;
  inspectorId: string;
  startedAt: string;
  completedAt?: string;
  identity: VehicleIdentity;
  obd: ObdScan;
  battery?: BatteryAssessment;
  checklist: ChecklistSection[];
  roadTest: RoadTest;
  media: InspectionMedia[];
  findings: Finding[];
  verdict?: 'buy' | 'buy_with_conditions' | 'reject';
  score?: number;
};
```

## Eerste voertuigprofielen
Prioriteit voor Volt & Vroom:
1. Toyota/Lexus Hybrid
2. Volkswagen Group PHEV/EV (o.a. Golf/Passat GTE, ID-serie)
3. Volvo PHEV/EV
4. Polestar
5. BMW PHEV/EV
6. Mercedes PHEV/EV
7. Hyundai/Kia Hybrid/PHEV/EV

## UX-hoofdschermen
1. Home – 'Nieuwe voertuigcheck'
2. Voertuig identificeren
3. Adapter verbinden
4. Automatische scan
5. Hybride/EV batterij
6. Inspectie checklist
7. Foto-opname
8. Proefrit
9. Bevindingen & herstelpunten
10. Eindbeoordeling
11. VVOS Voertuigrapport

## Scoring
Geen simpele universele conditie-score gebruiken als vervanging voor diagnose. Wel een transparante VVOS score opgebouwd uit:
- Techniek 35%
- HV-batterij/aandrijving 25% (bij HEV/PHEV/EV)
- Carrosserie/interieur 15%
- Banden/remmen/onderstel 15%
- Historie/documentatie 10%

Kritieke DTC's, veiligheidsgebreken of ernstige HV-afwijkingen kunnen de uitkomst overrulen.

## MVP-definition of done
- Mobiele inspectie kan volledig zonder laptop worden uitgevoerd.
- Basis OBD-II scan via BLE.
- Checklist en verplichte foto's.
- Handmatige en automatische bevindingen.
- Rapportpreview.
- Rapport wordt als snapshot aan vehicleId opgeslagen.
- Audit trail van inspecteur, tijd en bron van meetwaarden.
- Architectuur ondersteunt merkprofielen zonder de kernapp te herschrijven.

## Fase 2
- Kenteken/RDW/Mobilox-import.
- Merk-specifieke HV-data en gevalideerde SOH-methodes.
- AI-analyse van DTC-combinaties en foto's.
- Automatische reparatiebegroting.
- Vergelijking met bekende modelproblemen / CarCheck database.
- Verkoopversie van het rapport voor de klant.
- Interne inkoopversie met margerisico en advies maximale inkoopprijs.

## Launch X-431 V+ koppeling v0.1
De eerste professionele diagnosekoppeling gebruikt het door Launch gegenereerde Health Report als overdrachtsformaat. Dit voorkomt afhankelijkheid van het gesloten VCI/Bluetooth-protocol en bewaart de merkspecifieke scan van de Launch-software.

### Werkstroom
1. Sluit de Launch VCI aan en open **Intelligent Diagnose / Health Report**.
2. Voer bij voorkeur eerst een **Pre-Repair** volledige systeemscan uit.
3. Kies **Report**; het rapport staat daarna onder **Reports → Health Reports**.
4. Deel of bewaar het originele Launch-PDF.
5. Open VVOS Voertuigcheck en kies **Importeer Launch**.
6. VVOS decodeert de Base64 JSON-metadata uit het originele PDF en herkent VIN, merk, tester, ECU's, DTC-code, omschrijving en status. Aanvullende tekstvelden blijven als fallback ondersteund.
7. Controleer de geïmporteerde waarden en voltooi de fysieke inspectie.

### Auditregels
- Bron wordt vastgelegd als **LAUNCH X-431 V+ Health Report**.
- VVOS verzint geen ontbrekende waarden en overschrijft alleen velden die het rapport daadwerkelijk bevat.
- Een DTC is een diagnoseaanwijzing, geen automatische onderdelenvervanging of zelfstandig bewijs van een defect.
- Bewaar bij reparaties zowel Pre-Repair als Post-Repair rapport voor vergelijking.

### Volgende adapterversie
- Normalisatie en opslag van de originele Launch-PDF naast het VVOS-scanrecord.
- Upload/sync naar een VVOS-inbox zodat delen vanaf het Launch Android-tablet zonder handmatige bestandskeuze gaat.
- Mapping van Launch ECU-benamingen en statusvelden naar het genormaliseerde VVOS-datamodel.
- Onderzoek naar officiële Launch cloud-/partnerinterface; geen reverse engineering van de VCI-beveiliging.

### Gevalideerd praktijkbestand
De PDF-import is afgestemd op een origineel rapport van **X-431 PRO3 (V+ 5.0)** met OpenPDF metadata. Het testbestand bevatte 46 systemen, 32 foutcodes en drie Active/Static meldingen. De zichtbare rapporttekst en de gestructureerde metadata kwamen overeen.
