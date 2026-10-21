# Account ownership

Gebruik Volt & Vroom bedrijfsidentiteiten voor infrastructurele accounts zodra Google Workspace actief is.

Aanbevolen:
- GitHub organisatie: eigendom van Volt & Vroom, minimaal twee menselijke owners zodra mogelijk.
- Firebase staging en production: bedrijfsprojecten, geen afhankelijkheid van een privé-account als enige owner.
- Mik: production approver/owner.
- Alexander: developer-toegang volgens least privilege; production alleen wat nodig is.
- AI/Codex: codewijzigingen via repository en pull requests; geen permanente productiecredentials in prompts.

Documenteer altijd wie toegang heeft tot GitHub, Firebase, DNS, Workspace en Secret Manager.
