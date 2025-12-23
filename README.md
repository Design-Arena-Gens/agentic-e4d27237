## Email Agent

Inbox co-pilot that triages incoming threads, surfaces action items, and drafts polished replies.

### Key flows

- **Inbound triage** – Paste any email and get instant summary, sentiment, priority, action items, follow-up plan, and a ready-to-send reply draft.
- **Outbound drafting** – Provide audience, objective, tone, talking points, call to action, and signature to generate a complete outbound email with preview and cadence guidance.

### Run locally

```bash
npm install
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

### Tech

- Next.js App Router + TypeScript
- Tailwind (via `@tailwindcss/postcss`)
- API route with lightweight heuristics to analyze and compose email content
