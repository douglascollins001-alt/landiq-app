# LandIQ Railway Fix

This version avoids native SQLite dependencies so it is safer to deploy on Railway.

## Run locally

```bash
npm install
npm start
```

## Railway

Deploy the project with `package.json` at the repo root.

## What changed
- Listings are created from uploaded PDF or text files.
- Uploaded listings can prefill the Investment DCF or Development Appraisal.
- Persistence uses `data/db.json` instead of SQLite.
