# Orbit IG

A code-first Instagram operations panel for content planning, human-approved
engagement, and future Meta Graph API automation.

## Current personal-account mode

- Create and persist content drafts in the browser.
- Maintain an audience watchlist.
- Review suggested likes, follows, and comments.
- Open Instagram manually and record the completed or skipped action.
- Run local workflow components through `/api/workflows`.

No Instagram password is collected, and no interaction on an unrelated account
is performed automatically.

## Future professional-account mode

The official publishing, owned-post comment, inbox, and analytics pipelines are
capability-gated. After converting the account to Creator or Business, copy
`.env.example` to `.env.local`, complete Meta OAuth, and implement the provider
adapter using the existing workflow engine in `lib/workflows`.

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

The future Meta integration variables are documented in `.env.example`; add
them to the Vercel project's Environment Variables rather than committing a
`.env.local` file.
