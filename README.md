# VVOS Media Test

Prototype repository for separate vehicle media modules and VV 360° Studio experiments.

## Goal
- test a split media model for Mobilox vs. VV 360° Studio
- validate UI structure without touching production data
- prototype a premium studio background workflow and a consistent default background

## Default architecture
- one vehicle ID
- separate media collections for `mobilox_media` and `vv360_media`
- original Mobilox files remain unchanged
- VV 360° Studio gets its own status, publication flow and AI-cleanup pipeline
- default background selection: `VV Studio White`

## Local run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```
