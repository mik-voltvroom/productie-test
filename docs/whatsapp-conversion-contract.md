# WhatsApp conversion contract

All current public WhatsApp actions emit exactly one `whatsapp_click` with
the link's `href`, through the delegated listener in `PublicAnalytics`.
The floating dock and mobile action bar declare that same event explicitly;
ordinary `https://wa.me/` links use the existing inference.
Do not also emit `chat_click`: that would split or duplicate conversions.

## Published GTM configuration checked

On 9 October 2026, the public response from
`https://www.googletagmanager.com/gtm.js?id=GTM-P2882R3H` returned HTTP 200.
Its resource configuration contained this custom-event predicate:

```text
^(phone_click|email_click|whatsapp_click|route_click|match_started|inventory_click)$
```

The corresponding rule activates a GA4 event tag using the incoming event
name and measurement ID `G-D7XGSRR9K3`. It does not match `chat_click`.
The downloaded response SHA-256 was
`e4bb234fcbc7134e5d8d6ab58be21f4c1db8df3e06144881cda0aa79606950ac`.
This verifies the publicly served container at that time, not unpublished
workspaces, GA4 key-event settings, delivery to Google, or reporting totals.
No GTM configuration was changed.

## Consent and regression coverage

`tests/whatsapp-conversion.test.ts` mounts the real React components in
jsdom and dispatches bubbling clicks on nested icons/labels. It verifies
the actual dataLayer payload for both contact controls and an ordinary link.
It also checks that missing, rejected or invalid consent queues no click
events and loads no GTM script; opt-in loads one script and does not replay
earlier clicks; resetting consent stops subsequent WhatsApp events.

Consent commands themselves may exist in the dataLayer without opt-in.
The existing loaded-tag teardown issue after consent reset is outside this
event-name change; these tests do not claim previously loaded tags are removed.
ESLint configuration and PR #81 remain separate.
