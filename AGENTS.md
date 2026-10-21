# VVOS AI Development Rules

VVOS is het centrale softwareplatform van Volt & Vroom. Iedere menselijke of AI-ontwikkelaar werkt volgens deze regels.

## Prioriteiten
1. Behoud dataconsistentie tussen website, CRM, voorraad, Merchant Center en finance.
2. Voer autorisatie altijd server-side uit.
3. Gebruik eurocenten als integers voor nieuwe financiële modellen.
4. Simuleer nooit een geslaagde externe actie in productiemodus.
5. Voeg validatie en foutafhandeling toe aan iedere mutatie-API.
6. Houd de Volt & Vroom-interface rustig, minimalistisch en taakgericht.

## Verplichte controle voor iedere wijziging
```bash
npm run typecheck
npm run build
```

## Architectuur
- UI-componenten bevatten geen directe providerlogica.
- Externe koppelingen lopen via adapters/services.
- Databasecode loopt via repositories.
- Domeinlogica staat in `lib/<domein>/business.ts`.
- API-routes valideren invoer en controleren rechten.

## Veiligheid
- Nooit secrets committen.
- Nooit echte klantdata in seedbestanden.
- Geen voorspelbare klantportaaltokens in productie.
- Betalingen alleen bijwerken na server-side providerverificatie.
- Financiële correcties via tegenboekingen, niet door historie te overschrijven.
