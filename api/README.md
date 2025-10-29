# Security Vulnerability API

Express + MongoDB service that exposes paginated vulnerability data and
pre-computed dashboard metrics.

## Quick start

```bash
cd api
cp .env.example .env            # add your MongoDB connection string
npm install
npm run import                  # one-time import from ../public/ui_demo.json
npm run dev                     # starts http://localhost:4000
```

The API exposes:

- `GET /healthz` – basic health check
- `GET /api/vulnerabilities` – paginated list with query params:
  - `page` (default `1`)
  - `limit` (default `50`)
  - `severity`, `repo`, `group`, `kaiStatus`, `search`
  - `sort` (`severity|cvss|published|repoName`)
  - `direction` (`asc|desc`)
- `GET /api/vulnerabilities/:id` – fetch a single record.

Each list response is shaped as:

```jsonc
{
  "data": [...],
  "page": 1,
  "limit": 50,
  "total": 236656,
  "metrics": {
    "severityCounts": { "CRITICAL": 123, ... },
    "riskFactors": [{ "name": "Remote", "value": 42 }],
    "trend": [{ "month": "2024-01", "CRITICAL": 5, ... }],
    "aiManual": [{ "label": "CRITICAL", "ai": 10, "manual": 4 }],
    "highlights": [...],
    "repoSummary": [{ "name": "repo", "value": 120 }],
    "kpis": { "total": 236656, "remain": 236656, ... }
  }
}
```

## Deployment

Push this folder to your preferred hosting (Render, Railway, Fly.io, Vercel
functions, etc.) and set `VITE_API_URL` on the frontend to point at the deployed
origin.
