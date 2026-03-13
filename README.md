# LandIQ — updated build

This version keeps the app structure simple and changes the Listings logic so listings originate from uploaded PDF / text deal files.

## What changed
- Listings are now created from uploaded deal PDFs or text files.
- The app extracts salient information and stores a generated listing.
- Each listing can be pushed into:
  - Investment DCF
  - Development Appraisal

## Start
```bash
npm install
npm start
```

Open:
```bash
http://localhost:3000
```

## Notes
- PDF parsing uses `pdf-parse`.
- Extraction is rules-based to keep the build self-contained.
- Inputs loaded from a listing remain editable before model runs.
