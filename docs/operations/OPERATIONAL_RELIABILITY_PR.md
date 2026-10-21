# Voorbereide PR — niet aangemaakt

Titel: Maak VVOS-opvolging duurzaam en voeg beveiligde CarCheck-vrijgave toe

Bij ontbrekende Firebase-opslag kon VVOS succes of voorbeeldgegevens tonen, terwijl interne opvolging niet betrouwbaar via de server werd bewaard. Deze wijziging maakt opslagfouten expliciet, sluit directe clienttoegang en bewaart aanvragen en opvolging transactioneel. Een retry met dezelfde aanvraagcode maakt geen tweede lead of tweede automatische notificatie.

CarCheck krijgt centrale, onveranderlijke revisies, private bewijsbestanden en gecontroleerde vrijgave. Alleen een expliciet goedgekeurde publieke samenvatting verschijnt bij het voertuig. Het beperkte klantportaal krijgt verlopen/roteerbare/intrekbare tokens en staat standaard uit. Morning Intelligence gebruikt expliciete voorraadstart en opvolggegevens; onvolledige kosten en ongecontroleerde integraties worden niet als gezonde resultaten gepresenteerd. Finance toont buiten lokale demo geen voorbeeldadministratie.

Verder: sessierollen en Origin-controle aangescherpt; publieke widgets uitgesloten van privépagina's; staging/default-configuratiegrens verduidelijkt; bestaande Merchant-healthworkflow kan het repositoryscript nu importeren. Mobilox-broneigenaarschap en bestaande publieke voertuigallowlist behouden. Geen nieuwe dependencies.

Validatie: 649 regressietests, 30 lokale Firestore/Storage-emulatortests, typecheck, repository-/agent-/merkaudit en productiebuild geslaagd. Lint blijft geblokkeerd door bestaande interactieve configuratie; PR #81 behandelt dit. Responsive CarCheck-foutstatus gecontroleerd op mobiel/tablet/desktop. Geen geauthenticeerde staging-E2E of nieuwe remote CI uitgevoerd.

Review vooral serverrechten, nieuwe transacties/regels, bewijsupload en portaal. Overlap met #95, #93, #81, #82 en voertuigclassificatie #96 moet vóór samenvoegen opnieuw worden beoordeeld. Uitrol vereist API/UI vóór aangescherpte regels, gecontroleerde runtime-IAM, afzonderlijke stagingacceptatie en expliciet productieakkoord. Rollback en resterende finance-/providervoorwaarden staan in `OPERATIONAL_RELIABILITY.md`.
