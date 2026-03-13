const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { getCollection, upsertListing } = require('../lib/store');
const { extractListingFromText } = require('../lib/extract');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

router.get('/', (_req, res) => {
  res.json(getCollection('listings'));
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const fullPath = req.file.path;
    const original = req.file.originalname || 'uploaded-file.pdf';
    let text = '';

    if (/\.pdf$/i.test(original)) {
      const buffer = fs.readFileSync(fullPath);
      const parsed = await pdfParse(buffer);
      text = parsed.text || '';
    } else {
      text = fs.readFileSync(fullPath, 'utf8');
    }

    const listing = extractListingFromText(text, original);
    upsertListing(listing);
    res.json(listing);
  } catch (error) {
    res.status(500).json({ error: 'Upload parsing failed.', details: error.message });
  }
});

router.get('/:id', (req, res) => {
  const listing = getCollection('listings').find((x) => x.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  res.json(listing);
});

module.exports = router;
