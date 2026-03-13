const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { all, get, run } = require('../db/database');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, safeName);
  }
});

const upload = multer({ storage });

function currencyNumber(text) {
  if (!text) return null;
  const clean = text.replace(/[,£$]/g, '').trim();
  const num = Number(clean);
  return Number.isFinite(num) ? num : null;
}

function extractNumber(pattern, text, multiplier = 1) {
  const match = text.match(pattern);
  if (!match) return null;
  const value = currencyNumber(match[1]);
  return value == null ? null : value * multiplier;
}

function extractMoney(text, labels) {
  for (const label of labels) {
    const regex = new RegExp(`${label}[^\n\r]{0,50}?£?\s*([\d,.]+)\s*(m|million|k|thousand)?`, 'i');
    const match = text.match(regex);
    if (match) {
      const base = currencyNumber(match[1]);
      const unit = (match[2] || '').toLowerCase();
      if (base == null) return null;
      if (unit === 'm' || unit === 'million') return base * 1000000;
      if (unit === 'k' || unit === 'thousand') return base * 1000;
      return base;
    }
  }
  return null;
}

function extractPercent(text, labels) {
  for (const label of labels) {
    const regex = new RegExp(`${label}[^\n\r]{0,40}?([\d.]+)\s*%`, 'i');
    const match = text.match(regex);
    if (match) return Number(match[1]);
  }
  return null;
}

function extractText(text, labels) {
  for (const label of labels) {
    const regex = new RegExp(`${label}[:\-\s]{0,5}([^\n\r]{3,120})`, 'i');
    const match = text.match(regex);
    if (match) return match[1].trim();
  }
  return null;
}

function extractInteger(text, labels) {
  for (const label of labels) {
    const regex = new RegExp(`${label}[^\n\r]{0,30}?(\d{1,4})`, 'i');
    const match = text.match(regex);
    if (match) return Number(match[1]);
  }
  return null;
}

function titleFromText(text, originalName) {
  const line = text.split(/\r?\n/).find((x) => x.trim().length > 5);
  return line ? line.trim().slice(0, 120) : originalName.replace(/\.[^.]+$/, '');
}

function makeSummary(parsed) {
  const bits = [];
  if (parsed.assetType) bits.push(parsed.assetType);
  if (parsed.address) bits.push(parsed.address);
  if (parsed.price) bits.push(`Guide price £${Math.round(parsed.price).toLocaleString('en-GB')}`);
  if (parsed.yieldPercent) bits.push(`NIY ${parsed.yieldPercent}%`);
  if (parsed.gdv) bits.push(`GDV £${Math.round(parsed.gdv).toLocaleString('en-GB')}`);
  if (parsed.units) bits.push(`${parsed.units} units`);
  return bits.join(' • ');
}

function parseDealText(text, originalName) {
  const title = titleFromText(text, originalName);
  const assetType = extractText(text, ['asset type', 'property type', 'use']) || (/industrial/i.test(text) ? 'Industrial' : /residential|btr|pbsa/i.test(text) ? 'Residential' : /office|retail|commercial/i.test(text) ? 'Commercial' : /land/i.test(text) ? 'Land' : 'Mixed');
  const price = extractMoney(text, ['guide price', 'asking price', 'price', 'purchase price', 'land price']);
  const noi = extractMoney(text, ['noi', 'net operating income', 'passing rent', 'rental income']);
  const yieldPercent = extractPercent(text, ['yield', 'niy', 'cap rate', 'net initial yield']);
  const gdv = extractMoney(text, ['gdv', 'gross development value']);
  const units = extractInteger(text, ['units', 'apartments', 'beds', 'homes']);
  const niaSqft = extractMoney(text, ['nia', 'gia', 'area', 'sq ft', 'sqft']);
  const address = extractText(text, ['address', 'location']) || null;
  const region = address?.split(',').slice(-1)[0]?.trim() || null;
  const agent = extractText(text, ['agent', 'contact']) || null;
  const planning = extractText(text, ['planning', 'planning status']) || null;
  const tenure = extractText(text, ['tenure']) || null;
  const occupancy = extractText(text, ['occupancy', 'vacancy']) || null;
  const wault = extractPercent(text, ['wault']) || extractInteger(text, ['wault']);
  const siteArea = extractText(text, ['site area']) || null;

  const developmentSignals = [gdv, units, planning, extractMoney(text, ['build cost', 'construction cost'])].filter(Boolean).length;
  const investmentSignals = [noi, yieldPercent, occupancy, tenure, wault].filter(Boolean).length;

  let classification = 'unknown';
  if (developmentSignals > investmentSignals && developmentSignals >= 2) classification = 'development';
  else if (investmentSignals > developmentSignals && investmentSignals >= 2) classification = 'investment';
  else if (developmentSignals >= 1 && investmentSignals >= 1) classification = 'mixed';

  const highlights = [];
  if (price) highlights.push(`Price £${Math.round(price).toLocaleString('en-GB')}`);
  if (yieldPercent) highlights.push(`Yield ${yieldPercent}%`);
  if (noi) highlights.push(`NOI £${Math.round(noi).toLocaleString('en-GB')}`);
  if (gdv) highlights.push(`GDV £${Math.round(gdv).toLocaleString('en-GB')}`);
  if (units) highlights.push(`${units} units`);
  if (planning) highlights.push(`Planning: ${planning}`);

  const missing = [];
  if (!price) missing.push('price');
  if (!noi && classification !== 'development') missing.push('NOI/rent');
  if (!gdv && classification !== 'investment') missing.push('GDV');

  const confidenceScore = Math.min(0.95, 0.25 + (highlights.length * 0.12));

  return {
    title,
    sourceFileName: originalName,
    classification,
    address,
    assetType,
    region,
    agent,
    price,
    yieldPercent,
    noi,
    gdv,
    units,
    siteArea,
    niaSqft,
    planning,
    tenure,
    occupancy,
    wault,
    summary: makeSummary({ assetType, address, price, yieldPercent, gdv, units }),
    highlights,
    risks: missing.length ? [`Missing key fields: ${missing.join(', ')}`] : [],
    extractedFields: {
      price,
      noi,
      yieldPercent,
      gdv,
      units,
      niaSqft,
      planning,
      tenure,
      occupancy,
      wault,
      siteArea
    },
    rawText: text.slice(0, 25000),
    confidenceScore
  };
}

async function extractTextFromFile(filePath, mimeType) {
  if (mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
    const dataBuffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(dataBuffer);
    return parsed.text || '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

router.get('/', async (req, res) => {
  const rows = await all(`SELECT * FROM listings ORDER BY datetime(created_at) DESC, id DESC`);
  res.json(rows.map((row) => ({
    ...row,
    highlights: JSON.parse(row.highlights_json || '[]'),
    risks: JSON.parse(row.risks_json || '[]'),
    extractedFields: JSON.parse(row.extracted_fields_json || '{}')
  })));
});

router.get('/:id', async (req, res) => {
  const row = await get(`SELECT * FROM listings WHERE id = ?`, [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Listing not found' });
  return res.json({
    ...row,
    highlights: JSON.parse(row.highlights_json || '[]'),
    risks: JSON.parse(row.risks_json || '[]'),
    extractedFields: JSON.parse(row.extracted_fields_json || '{}')
  });
});

router.post('/upload', upload.single('dealFile'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const extractedText = await extractTextFromFile(req.file.path, req.file.mimetype);
  const parsed = parseDealText(extractedText, req.file.originalname);

  const insert = await run(`INSERT INTO listings (
    title, source_file_name, source_type, classification, address, asset_type, region, agent,
    price, yield_percent, noi, gdv, units, site_area, nia_sqft, planning, tenure,
    occupancy, wault, summary, highlights_json, risks_json, extracted_fields_json,
    raw_text, confidence_score
  ) VALUES (?, ?, 'pdf', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    parsed.title,
    parsed.sourceFileName,
    parsed.classification,
    parsed.address,
    parsed.assetType,
    parsed.region,
    parsed.agent,
    parsed.price,
    parsed.yieldPercent,
    parsed.noi,
    parsed.gdv,
    parsed.units,
    parsed.siteArea,
    parsed.niaSqft,
    parsed.planning,
    parsed.tenure,
    parsed.occupancy,
    parsed.wault,
    parsed.summary,
    JSON.stringify(parsed.highlights),
    JSON.stringify(parsed.risks),
    JSON.stringify(parsed.extractedFields),
    parsed.rawText,
    parsed.confidenceScore
  ]);

  const created = await get(`SELECT * FROM listings WHERE id = ?`, [insert.lastID]);
  res.json({
    ...created,
    highlights: JSON.parse(created.highlights_json || '[]'),
    risks: JSON.parse(created.risks_json || '[]'),
    extractedFields: JSON.parse(created.extracted_fields_json || '{}')
  });
});

module.exports = router;
