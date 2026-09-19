# Orbit IG

A code-first Instagram operations panel for account-scoped content drafts,
read-only eligible DMs, official professional-account connection, and monitored
workflow validation.

## Current capability map

- Connected accounts have account-scoped drafts, manual watchlists, and approval
  records in MongoDB. New disconnected drafts cannot be saved.
- Inbox reads eligible conversations and messages from Meta's official API when
  the connected account requested `instagram_business_manage_messages`.
- The approval queue starts empty. No suggestions or unrelated account actions
  are fabricated.
- Caption validation is available. Publishing, comment automation, and outbound
  DM replies are not implemented or represented as active.
- The included NabzLab Nava concept post is a draft for `@nabzlabai` only. It
  will never publish without a separate action.

No Instagram password is collected, and no interaction on an unrelated account
is performed automatically.

## Local AI

Open **Settings → Local AI** to enable a model server running on the same
computer. Orbit supports:

- Ollama, using `http://127.0.0.1:11434` by default.
- OpenAI-compatible local servers such as LM Studio, using
  `http://127.0.0.1:1234` by default.

The browser calls the loopback model server directly, even when the panel is
hosted on Vercel. Use **Use local Qwen in LM Studio** for the installed
`qwen/qwen3.5-9b` model on port 1234. LM Studio must be running with CORS
enabled. If its server requires authentication, enter an API token in Settings;
the token stays in the current browser tab and is not sent to Vercel. Use
**Test connection** before generating a caption. An app hosted on Vercel cannot
call `127.0.0.1` on the user's laptop from a server route.

The local AI URL is limited to loopback addresses. Each operator needs their
own local model server; this is not a shared AI service for clients.

## Instagram Business connection

Orbit uses Meta's Instagram Login flow for Business and Creator accounts. This
flow does not require a linked Facebook Page. Access tokens are exchanged for
long-lived tokens, encrypted with AES-256-GCM, and stored in MongoDB. The browser
keeps only a signed, HTTP-only connection cookie.

1. Create a Meta app and select **API setup with Instagram login**.
2. Set `APP_URL` to the public HTTPS origin. In Meta Developers, open **Use
   cases → Instagram API → API setup with Instagram login → Set up Instagram
   business login → Business login settings → OAuth redirect URIs** and add
   the exact `APP_URL/api/instagram/callback` URL. The generated Embed URL may
   point to the site root; that URL is only an example and cannot receive
   Orbit's OAuth callback. The scheme, host, path, and trailing slash must
   match exactly.
3. Copy `.env.example` to `.env.local` and fill in MongoDB, Instagram App, and
   secret values. For local work set `APP_URL=http://localhost:3000`. On Vercel,
   set the same keys in Project → Settings → Environment Variables with
   `APP_URL` equal to the HTTPS production origin.
4. Start the app and use **Settings → Instagram Business connection**. The
   panel shows the exact redirect URI the server will send to Meta.

While the Meta app is unpublished, add the connecting Instagram account under
**App roles → Roles → Add People → Instagram tester** and accept the invitation
from that Instagram account. Otherwise Meta may show "Insufficient Developer
Role" after the redirect URI is fixed. Production use of publishing, comment,
and messaging permissions may require Meta App Review and Advanced Access.
Each client must connect their own professional account; adding an Instagram
tester is only a development path. Meta's Instagram setup page explicitly says
live data requires successful app review. The app cannot self-approve.

For webhooks, register `APP_URL/api/instagram/webhook` as the callback URL and
enter the same value as `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` in both Meta and the
application environment. The webhook URL is separate from the OAuth redirect.

## MongoDB and monitoring

When Instagram is connected, content drafts, approvals, and the audience
watchlist synchronize to MongoDB. Seeded demo records are removed on load.
The **Activity** screen shows database and
connection health plus durable job history for workflows, local AI operations,
OAuth connections, disconnects, and token refreshes.

Vercel runs `/api/cron/monitor` daily using `vercel.json`. Set `CRON_SECRET` in
Vercel so this route can refresh tokens that are within seven days of expiry.

## Development

```bash
npm install
npm run dev
```

Production validation:

```bash
npm run lint
npm run build
```

## Deploy to Vercel

Import this directory as a Vercel project. Vercel will detect Next.js and use
`npm run build` automatically. No custom build or output-directory setting is
required.

Set `NEXT_PUBLIC_SITE_URL` to the canonical production URL if you use a custom
domain. Vercel's generated production URL is detected automatically otherwise.

All required MongoDB and Meta variables are documented in `.env.example`; add
them to the Vercel project's Environment Variables rather than committing a
`.env.local` file. Set `APP_URL` to the final HTTPS origin and register the exact
`/api/instagram/callback` URL in the Meta App Dashboard.
