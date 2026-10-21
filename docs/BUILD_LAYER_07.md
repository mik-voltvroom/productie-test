# VVOS Layer 07 — Finance, Accounting & Management Control

## Doel
Layer 07 vertaalt commerciële en operationele activiteiten naar betrouwbare financiële stuurinformatie. De module is ontworpen als subadministratie en managementlaag; voor een wettelijke boekhouding blijft een koppeling met bijvoorbeeld Exact Online, Moneybird of Twinfield wenselijk.

## Modules
- Financiële cockpit met omzet, brutowinst, EBITDA en liquiditeit
- Verkoop- en inkoopfacturen met btw-uitsplitsing
- Debiteuren- en crediteurenbeheer
- Banktransacties en factuurmatching
- Voorraadfinanciering en rentekosten per voertuig
- Unit economics en werkelijke bijdrage per auto
- Budget versus actual versus forecast
- Ouderdomsanalyse debiteuren
- Management scorecard en risicosignalering
- Immutable journaal/audit trail

## Datacollecties
`invoices`, `bank_transactions`, `expenses`, `inventory_funding`, `budget_lines`, `management_kpis`, `ledger_entries`, `vehicle_profitability`.

## Productie-integraties
1. Bank PSD2/CAMT-import
2. Exact Online of vergelijkbare grootboeksoftware
3. Mollie/Stripe settlement import
4. VWE/RDW voertuigkoppeling
5. Voorraadfinancier-provider
6. Document OCR voor inkoopfacturen

## Accounting-principes
- Geldbedragen worden afgerond op twee decimalen.
- Journaalregels worden na definitieve boeking immutable.
- Correcties gebeuren via tegenboekingen, niet door historische mutaties te overschrijven.
- Btw wordt per regel en tarief berekend en controleerbaar opgeslagen.
- Iedere voertuiggerelateerde transactie bevat waar mogelijk `vehicleId`.
- Iedere werkplaatstransactie bevat waar mogelijk `workOrderId`.

## Belangrijk
Deze starter bevat demo-data en preview-API's. Er worden geen echte bank-, fiscale of boekhoudkundige mutaties uitgevoerd zonder providercredentials en expliciete productieconfiguratie.
