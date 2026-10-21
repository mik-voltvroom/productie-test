# Mobilox / Hexon inventory integration

Date inspected: 2026-08-18

Branch: `rc/consolidation-v1.3.0`

Status: repository implementation only / not configured / not deployed

## Verified provider state

The signed-in Mobilox and Hexon "Eigen Website" environments were inspected read-only:

- Mobilox contains two vehicles;
- `Eigen Website Incrementeel 1` is active for the vehicle category `Auto's`;
- one vehicle is currently selected for that connection;
- Hexon is configured for version 2.25, HTTP POST XML and Dutch field names;
- the endpoint URL and dedicated HTTP Basic username/password are empty;
- no vehicle has been transferred successfully and Hexon reports a configuration problem.

No provider setting, vehicle selection, credential or retry action was changed during this inspection.

## Repository contract

Hexon can POST incremental XML mutations to:

`POST /api/hexon/inventory`

The hook:

- is reachable without a browser session but fails closed on missing or invalid dedicated HTTP Basic credentials;
- accepts XML only and enforces a 2 MB body limit;
- rejects DTD/entity declarations and invalid XML;
- maps the documented flat DV fields to the VVOS vehicle model;
- converts retail euros to integer cents at the integration boundary;
- publishes complete inventory and identifies conventional petrol/diesel vehicles without misclassifying them as hybrid;
- keeps incomplete vehicles in `review`;
- archives a vehicle when Hexon sends a delete/offline mutation;
- persists through Firebase Admin only and returns `503` rather than claiming success when Firestore is unavailable;
- returns the bare `1`/`0` response expected by the incremental DV client.

## Activation gate

Before a staging activation:

1. create dedicated random staging values for `HEXON_SYNC_USERNAME` and `HEXON_SYNC_PASSWORD` in the approved secret store;
2. expose only those secrets to the staging runtime;
3. deploy one exact CI-tested RC SHA to staging after explicit approval;
4. enter the staging HTTPS endpoint and dedicated credentials in Hexon;
5. send one selected vehicle first and inspect the actual v2.25 payload/readback;
6. compare Mobilox, Firestore and the public vehicle page before enabling a full resend;
7. configure the public URL pattern only after the generated VVOS slug has been verified.

Do not reuse the Mobilox/Hexon portal login as webhook authentication. Do not use `Alle advertenties wijzigen` or `Alles opnieuw oversturen` before the one-vehicle staging acceptance succeeds.

## Remaining evidence

The parser is covered by representative flat-schema fixtures derived from the provider documentation. The actual account payload has not yet reached VVOS because the provider endpoint is blank. Live v2.25 field-shape validation therefore remains an explicit staging acceptance gate, not a completed claim.
