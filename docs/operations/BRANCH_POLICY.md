# VVOS branch policy

## main
Production-only. Geen directe pushes. PR vereist. CI vereist. Alleen code die op staging is geaccepteerd.

## staging
Integratie- en acceptatiebranch. Automatische Firebase staging deployment. CI vereist.

## feature/*
Werkbranches voor wijzigingen. Kortlevend. Altijd terug via PR naar staging.

## Production approval
De production rollout vereist expliciet akkoord van Mik. Een AI-agent mag production nooit autonoom promoveren zonder die expliciete opdracht.
