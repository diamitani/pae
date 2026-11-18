# SalesGency Agent Harness

Interactive web app for the Prospect Automation Engine. Describe your target customer, pick your GTM stack (n8n, Make, Clay, Smartlead, ...), and it runs a 6-step pipeline:

1. Find companies with live buying signals (Gemini + Google Search grounding)
2. Normalize target companies and domains
3. Guess decision-maker emails and verify each domain's mail server (live DNS MX check)
4. Compile a 6-part account research brief
5. Draft a personalized email
6. Human approval gate, then dispatch approved drafts to your own webhook (e.g. n8n) for sending

It also exports the workflow as ready-to-import files for n8n, Make.com, Gumloop, Composio, or a SKILL.md pack.

## Stack

React 19 + Vite frontend, Express server (local dev + single Vercel serverless function), Gemini API (`@google/genai`).

## Run locally

```bash
npm install --legacy-peer-deps
cp .env.example .env   # fill in GEMINI_API_KEY and APP_PASSWORD
npm run dev            # http://localhost:3000
```

Production check: `npm run build && NODE_ENV=production npm start`

## Deploy (Vercel)

The repo ships `vercel.json` + `api/index.ts`: the whole app (UI and API) runs through one serverless function behind the login gate.

1. Import the repo in Vercel (or `vercel link`).
2. Set env vars: `GEMINI_API_KEY`, `APP_PASSWORD`.
3. Deploy.

## Security notes

- The entire app sits behind a single-user password login (`APP_PASSWORD`, HMAC-signed HttpOnly cookie, 7-day session, basic login throttling). Do not deploy without `APP_PASSWORD` set.
- Step 06 dispatch only fires after explicit human approval, and only to public `https` webhook URLs. Private/internal addresses (localhost, RFC-1918 including 172.16-31, link-local, CGNAT, IPv6 literals) and hostnames that resolve to private IPs are refused.
- Contact emails are model-guessed (e.g. `first@company.com`). The MX check proves the company receives mail, not that the person or address exists. Review each prospect and verify addresses before approving dispatch.

## Repo layout

- `server.ts` - local dev/prod entry (Vite middleware in dev, static `dist/` in prod)
- `server/app.ts` - the Express app: auth gate, pipeline API routes, SSRF guard, static serving
- `api/index.ts` - Vercel serverless entry
- `src/` - React frontend
- `design-assets/` - the design PDF that seeded this build
