# LandIQ — UK Property Intelligence Platform

A full Node.js app. Download, install, run. No cloud setup needed.

## Requirements
- **Node.js 18+** — download from https://nodejs.org (choose "LTS")
- That's it. No database to install, no API keys needed to start.

---

## Quick Start (3 steps)

**Step 1 — Install dependencies**
```
npm install
```

**Step 2 — Start the app**
```
npm start
```

**Step 3 — Open in your browser**
```
http://localhost:3000
```

The app creates a local `landiq.db` SQLite file automatically with demo data on first run.

---

## What's included

| Page | What it does |
|---|---|
| **Map** | Browse 5 demo properties with title, planning, ownership & valuation tabs |
| **Portfolio** | Asset register with AUM, yield, LTV. Add/delete assets |
| **DCF Model** | Full discounted cash flow: levered/unlevered IRR, equity multiple, NPV, DSCR, sensitivity matrix, amortisation schedule |
| **Pipeline** | Kanban deal tracker across Prospecting → Due Diligence → Offer/Legal → Exchanged |

---

## Development mode (auto-restart on file changes)
```
npm run dev
```

---

## Connecting real UK data APIs

All routes are pre-wired and ready — just add API keys to a `.env` file:

```
HMLR_API_KEY=          # https://use-land-property-data.service.gov.uk/
COMPANIES_HOUSE_KEY=   # https://developer.company-information.service.gov.uk/
PLANNING_PORTAL_KEY=   # https://www.planningportal.co.uk/
OS_API_KEY=            # https://osdatahub.os.uk/
EPC_EMAIL=             # https://epc.opendatacommunities.org/
EPC_KEY=
```

All have free tiers sufficient for development.

---

## File structure
```
landiq-app/
  src/
    server.js          — Express entry point
    db/database.js     — SQLite setup + demo seed data
    routes/
      portfolio.js     — Asset CRUD
      pipeline.js      — Deal pipeline CRUD
      dcf.js           — DCF calculation engine
      properties.js    — Property search
  public/
    index.html         — Full frontend (map, portfolio, DCF, pipeline)
  package.json
  landiq.db            — Created automatically on first run
```
