# Instagram release review — 19 September 2026

## Verified product paths

| Area            | Current behavior                                                                                                                                    | Release status                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Instagram Login | OAuth callback and connected professional profile are working on Vercel for `@nabzlabai`.                                                           | Tester validation only                     |
| Inbox           | Reads eligible conversations and paginated messages directly from Meta with the connected account token. Read only; API errors appear in the panel. | Needs authenticated live test after deploy |
| Content         | Account-scoped drafts in MongoDB. One Nava concept image from nabzlab.com and caption are prepared for `@nabzlabai`; no publish action occurs.      | Draft review ready                         |
| Approvals       | Empty queue until real records are created. Manual open/skip/done actions remain. No automatic discovery.                                           | Manual only                                |
| Audience        | Manual reference watchlist in the connected account's state.                                                                                        | Manual only                                |
| Automations     | Caption validation is functional. Other provider workflows return 501 and appear locked.                                                            | Not an active automation service           |
| Activity        | MongoDB job counters and maintenance activity.                                                                                                      | Existing capability                        |
| Local AI        | Browser calls localhost directly. LM Studio Qwen preset uses port 1234; token stays in tab.                                                         | Requires token and live panel test         |

## Meta state observed in the app dashboard

- App `Ops` / Instagram app `Ops - IG` was **Unpublished**.
- Instagram `instagram_business_basic` and `instagram_business_manage_messages` showed **Ready for testing**, with 0 API calls shown on the permissions page.
- `instagram_business_content_publish` and `instagram_business_manage_comments` now show **Ready for testing**. The comments permission initially returned Meta's **Something went wrong** dialog, but a later dashboard check confirmed it was added.
- App Review showed **Not submitted**. The Instagram setup page says successful App Review is required before the app can access live data.
- The App Review request list also showed unrelated `manage_fundraisers`, `public_profile`, and Marketing API Access Tier requests. Review/remove irrelevant requests before submitting the Instagram use case.

These dashboard statuses are Meta configuration, not evidence of Advanced Access or approval. Only Meta can grant public production access.

## Client onboarding and production gates

1. Finish the owned-account read paths and authenticated live inbox test using a consented test message. The API can omit old Requests, and available history is limited by Meta.
2. In Vercel, ensure `INSTAGRAM_SCOPES` includes `instagram_business_basic,instagram_business_manage_messages,instagram_business_content_publish,instagram_business_manage_comments`. Reconnect `@nabzlabai` to obtain a new token after changing scopes. The values stored in the connection currently reflect requested scopes, not independently verified grants.
3. Keep unrelated permissions out of the Instagram App Review submission. Ready for testing does not grant access to external clients.
4. Complete Meta's use-case App Review requirements: business verification as required, privacy policy and data deletion/deauthorization endpoints, review instructions and test credentials, screencast of each requested permission, and publication. Confirm exact requirements in the live dashboard before submission.
5. Build a client identity/organization model and role-based access before inviting external clients to the shared panel. The current signed Instagram cookie scopes data to one connected Instagram account; it is not a full SaaS tenant/admin authorization system.
6. A client's Instagram user ID is shown in Settings after OAuth. During unpublished testing, invite that specific account as an Instagram tester and have its owner accept. After public approval, clients should connect through OAuth without being added as testers.
7. Test with a separate client-owned professional account and confirm its drafts, inbox, logs, and credentials are isolated from `@nabzlabai`.

## Safe release check

- `npm run lint` and `npm run build` pass.
- Confirm production deployment SHA matches GitHub main before testing.
- Check `/api/health`, then in an authenticated production browser inspect Settings scopes, Inbox, Content draft, and Activity.
- Send one consented DM from a tester account to `@nabzlabai`; refresh Inbox and verify sender, message text, timestamp, pagination, and error behavior. Do not infer complete history from an empty response.
- Validate Local AI with LM Studio authentication token in the operator's browser. Generate a sample caption, review it, and leave it as a draft.
