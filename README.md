# Security Vulnerability Dashboard

This project is a boilerplate setup for a React-based dashboard that visualizes security vulnerabilities from a large JSON dataset.

## Getting Started

1. Install dependencies (requires Node.js and npm or pnpm):

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

3. Build for production:

   ```bash
   npm run build
   ```

## Project Structure

```
security-vuln-dashboard/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ index.css
│  ├─ app/
│  │  └─ store.ts
│  ├─ data/
│  │  ├─ loader.ts
│  │  └─ types.ts
│  ├─ workers/
│  │  └─ jsonStreamer.worker.ts
│  ├─ features/
│  │  └─ vulns/
│  │     ├─ slice.ts
│  │     └─ selectors.ts
│  ├─ routes/
│  │  ├─ Dashboard.tsx
│  │  └─ VulnDetail.tsx
└─ ...
```

This boilerplate provides a minimal starting point. Implement loading, parsing, filtering, and visualization logic in the respective files.