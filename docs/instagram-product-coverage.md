# Instagram CRM production coverage (19 September 2026)

## Evidence and limits

Directam's public [feature overview](https://directam.ir/) and [panel training](https://directam.ir/panel-training/) describe keyword replies, comment and live triggers, story reply flows, media and buttons, product carousels, forms, phone capture, SMS, and scheduled follow-ups. Its [follow-up page](https://directam.ir/followup-feature/) describes a keyword initiated sequence of at most five messages within 24 hours. These are product claims, not evidence about Directam's private backend or a reusable Meta approval for this app.

Meta's official [Instagram Send API collection](https://www.postman.com/meta/instagram/folder/uxudqu0/send-api) requires the professional account's messaging token and an Instagram user initiated conversation. Its [Conversations API collection](https://www.postman.com/meta/messenger-platform-api/folder/22794852-255610cd-47f5-4f4d-b3fa-71aec360be9a) says Advanced Access is required for conversations with people who have no app/business role; old Requests can be absent. Do not promise unsolicited welcome messages, unrestricted bulk DMs, complete historic inboxes, or support for all user accounts.

| Capability | Current Orbit behavior | Work before customer use |
| --- | --- | --- |
| Instagram OAuth | Professional account connection and encrypted token | Verify actual granted scopes and per-account webhook subscriptions; rotate/refresh reliably |
| Inbox | Meta conversations read-only; alternate `/me` path and an account-scoped diagnostic shipped in `2c2729a` | Reproduce one inbound DM on live account, retain webhook events, handle pages and sender identity; verify Advanced Access |
| Manual reply and keyword response | No send operation | Inbound event storage, opt-in rule editor, rate/window checks, dedupe, retry and audit log; separate preview from active mode |
| Comment and live triggers | No live source | Subscribe authorized fields, verify signed events, own-media mapping and comment-to-private-reply API rules |
| Story replies and icebreakers | No source or editor | Check official event types and supported entry points; build reviewed flow editor |
| Photo, video, voice, buttons, carousel | No outbound messaging | Validate supported Meta payloads, media hosting, accessibility, previews, and errors by type |
| Forms, lead capture and exports | No structured customer records | Tenant-scoped field schema, consent, retention/deletion, export permissions and data minimization |
| Phone capture and SMS | No SMS provider | Consent and jurisdiction-specific opt-in; provider integration and unsubscribe handling |
| Scheduled follow-ups | No send worker | User initiated conversations, Meta messaging window, cancellation, rate controls, idempotent queue |
| Content | Drafts in MongoDB; Nava concept draft prepared | Media validation, review/publish worker and verified published post URL |
| AI | Browser-local LM Studio option | Live authenticated panel inference test and explicit approval before any outbound use |
| Multi-client operations | Signed Instagram account cookie, no organization roles | Separate operator identity, business tenant membership, role permissions, audit access and deletion flows |

## Current live release gates

1. The authenticated production diagnostic returned `identityMatches: true` and `identifiersDiffer: true`. All three conversation reads (`me`, connected account, profile ID) returned zero rows without an API error. This confirms that the connected token reaches Meta and matches the stored account; it does **not** establish that the messaging permission was granted or that all Instagram DMs are available through the API.
2. In Meta Developers > Ops > Review > Verification, business portfolio **Nabz** (ID `3261307337377735`) is **Incomplete**. Business verification is part of the App Review and access path for serving client accounts. It is not a prerequisite for completing OAuth, and the zero-row diagnostic alone does not show that verification is the cause of this account's missing DM.
3. Meta App Review submission is disabled pending Verification, App settings, Allowed usage, Data handling, and Reviewer instructions. Review and publish only the permissions demonstrated by working product flows; Meta decides approval.
4. Do not invite customers into the current shared panel. Client OAuth after Meta approval should replace per-customer tester invitations; the app still needs organization auth and tested account isolation.

## Next acceptance sequence

1. Check the token's **granted** `instagram_business_manage_messages` permission, rather than the requested scopes stored by older connections. Compare a fresh inbound message from an eligible test sender with a non-role sender; neither a successful Basic profile lookup nor three empty conversation lists proves messaging access.
2. Confirm in Meta dashboard that `messages` is subscribed for the app and that the connected account has the required account-level subscription. A verified callback alone does not prove delivery.
3. Store signed inbound webhook events idempotently per connected Instagram account; reconcile them with Graph conversation history. Exercise a consented inbound DM and verify sender, text, timestamp and repeated delivery.
4. Build manual reply first, then opt-in keyword rules and time-limited follow-ups. Verify actions with the customer's explicit choice and maintain logs and kill switches.
5. Complete Nabz business verification and Tech Provider access verification using genuine company records; record reviewer demos for each requested Meta permission. Test a separate client-owned business account only after Meta grants the necessary access and tenant authorization is in place.
