# Search Console in VVOS

The existing `/dashboard/seo` page loads read-only Search Analytics after verifying the session and both `integrations.read` and `vehicles.read`. Owner, admin and marketing keep their existing visibility. No new public API or Firestore collection is created.

## Configuration

- Google project: `voltvroom-productie`; enable `searchconsole.googleapis.com`.
- Exact URL-prefix property: `https://www.voltvroom.nl/`.
- The property has granted Restricted access to `firebase-app-hosting-compute@voltvroom-productie.iam.gserviceaccount.com` on 17 October 2026. Confirm that the deployed backend actually runs as this identity.
- Server-only `GOOGLE_SEARCH_CONSOLE_ENABLED=true` enables requests only when the existing production/Firebase/origin checks pass. Other environments do not call Google. Disable the flag to roll back this integration.
- Authentication uses Google Application Default Credentials with `https://www.googleapis.com/auth/webmasters.readonly`. No downloaded keys, browser tokens, client secrets or Firebase browser keys are used. Existing Firebase admin credential environment variables are not automatically copied into this integration.
- A metadata-based identity may lack the required non-Cloud OAuth scope. A 401/403 is shown as access denied, not a working connection. Inspect the actual runtime error privately; verify the identity, Search Console property and scopes. If scoped service-account impersonation is needed, prepare an independently reviewed, narrowly scoped IAM change rather than granting project-wide access or downloading a permanent key.

## Reporting contract

28 inclusive Pacific calendar dates, ending three days before the Pacific current date; finalized `web` data only. Three fixed read queries: property aggregate, top ten pages, top ten queries. Top lists are not a complete export; Google may omit queries and rows. Never sum the lists to derive property totals. Successful empty data is distinct from unavailable or forbidden data. Search Analytics does not prove complete index coverage or live rankings.

Each process shares in-flight requests and caches successful reports for at most 15 minutes; transient failures for 60 seconds. The Pacific end date invalidates yesterday's report. Requests have eight-second transport timeouts, ten-second signals and no automatic retries; a 15-second service deadline also bounds credential discovery. Scaling creates independent caches. No background job, persistent history or euro cost claim is introduced.

## Release verification

1. Typecheck, production build, unit tests and existing repository/brand gates must pass on the PR commit. Keep this work separate from open photo/consent/package PRs.
2. Deploy the reviewed commit through the normal release process. Verify the active runtime identity and flag; do not infer runtime credentials from a serviceaccount's name.
3. As owner/admin/marketing, open `/dashboard/seo`. Confirm `ready` or an honest `empty`, the exact property, period and fetch timestamp. Compare totals for the identical finalized web date range in Search Console. Confirm a denied role cannot trigger provider calls.
4. Test absent permission or unavailable provider in staging with synthetic responses, never by disrupting production permissions. Do not record access tokens or real search queries in logs or fixtures.
5. Roll back with `GOOGLE_SEARCH_CONSOLE_ENABLED=false` and a normal deployment, or revert this PR. Existing SEO checks remain available.

## Primary references

- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/webmaster-tools/v1/how-tos/authorizing
- https://developers.google.com/webmaster-tools/limits
- https://docs.cloud.google.com/run/docs/securing/service-identity

Cloud setup is verified separately from the code. A passing unit test with synthetic Google responses is not evidence that production authorization or the end-to-end connection works.
