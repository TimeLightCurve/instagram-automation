# Orbit IG

A code-first Instagram operations panel for content planning, human-approved
engagement, official professional-account connection, and monitored workflows.

## Current personal-account mode

- Create content drafts with browser storage as an offline fallback.
- Maintain an audience watchlist.
- Review suggested likes, follows, and comments.
- Open Instagram manually and record the completed or skipped action.
- Run local workflow components through `/api/workflows`.

No Instagram password is collected, and no interaction on an unrelated account
is performed automatically.

## Local AI

Open **Settings → Local AI** to enable a model server running on the same
computer. Orbit supports:

- Ollama, using `http://127.0.0.1:11434` by default.
- OpenAI-compatible local servers such as LM Studio, using
  `http://127.0.0.1:1234` by default.

The model name is optional. When left empty, Orbit selects the first model
reported by the server. For Ollama, `qwen3:8b` is an example model name. Use the
**Test connection** button after the local model server is running.

Local AI requests are accepted only for loopback or `host.docker.internal`
addresses. The panel and model server must run on the same laptop; a Vercel
deployment cannot reach a model running on your laptop.

## Instagram Business connection

Orbit uses Meta's Instagram Login flow for Business and Creator accounts. This
flow does not require a linked Facebook Page. Access tokens are exchanged for
long-lived tokens, encrypted with AES-256-GCM, and stored in MongoDB. The browser
keeps only a signed, HTTP-only connection cookie.

1. Create a Meta app and select **API setup with Instagram login**.
2. Set `APP_URL` to the public HTTPS origin and register its exact
   `/api/instagram/callback` URL under **Instagram → API setup with Instagram
   login**. The scheme, host, path, and trailing slash must match exactly.
3. Copy `.env.example` to `.env.local` and fill in MongoDB, Instagram App, and
   secret values. For local work set `APP_URL=http://localhost:3000`. On Vercel,
   set the same keys in Project → Settings → Environment Variables with
   `APP_URL` equal to the HTTPS production origin.
4. Start the app and use **Settings → Instagram Business connection**. The
   panel shows the exact redirect URI the server will send to Meta.

During development, the Instagram account must be an app tester or otherwise
have access to the app. Production use of publishing, comment, and messaging
permissions may require Meta App Review and Advanced Access.

For webhooks, register `APP_URL/api/instagram/webhook` as the callback URL and
enter the same value as `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` in both Meta and the
application environment. The webhook URL is separate from the OAuth redirect.

## MongoDB and monitoring

When Instagram is connected, content drafts, approvals, and the audience
watchlist synchronize to MongoDB. The **Activity** screen shows database and
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
