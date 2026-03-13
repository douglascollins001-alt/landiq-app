function parseMoney(text, labelPatterns) {
  for (const pattern of labelPatterns) {
    const match = text.match(pattern);
    if (match) return toNumber(match[1]);
  }
  return null;
}

function parseNumber(text, labelPatterns) {
  for (const pattern of labelPatterns) {
    const match = text.match(pattern);
    if (match) return Number(String(match[1]).replace(/,/g, ''));
  }
  return null;
}

function parseText(text, labelPatterns) {
  for (const pattern of labelPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function toNumber(raw) {
  const cleaned = String(raw).replace(/[,£$€]/g, '').trim();
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function classify(text) {
  const lower = text.toLowerCase();
  const inv = ['yield', 'noi', 'passing rent', 'tenant', 'lease', 'wault', 'cap rate'];
  const dev = ['gdv', 'development', 'planning', 'build cost', 'construction', 'residential units', 'scheme'];
  const invHits = inv.filter((x) => lower.includes(x)).length;
  const devHits = dev.filter((x) => lower.includes(x)).length;
  if (invHits && devHits) return 'mixed';
  if (devHits > invHits) return 'development';
  if (invHits > 0) return 'investment';
  return 'unknown';
}

function extractHighlights(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 20)
    .slice(0, 5);
}

function extractListingFromText(text, sourceFileName) {
  const title = parseText(text, [
    /property\s*name\s*[:\-]\s*(.+)/i,
    /asset\s*name\s*[:\-]\s*(.+)/i,
    /^(.{8,80})$/m
  ]) || sourceFileName.replace(/\.[^.]+$/, '');

  const address = parseText(text, [
    /address\s*[:\-]\s*(.+)/i,
    /location\s*[:\-]\s*(.+)/i
  ]);

  const price = parseMoney(text, [
    /(?:asking price|price|purchase price)\s*[:\-]?\s*[£]?([\d,]+(?:\.\d+)?)/i,
    /[£]([\d,]{4,})/i
  ]);

  const noi = parseMoney(text, [
    /(?:noi|net operating income|net income|passing rent)\s*[:\-]?\s*[£]?([\d,]+(?:\.\d+)?)/i
  ]);

  const gdv = parseMoney(text, [
    /(?:gdv|gross development value)\s*[:\-]?\s*[£]?([\d,]+(?:\.\d+)?)/i
  ]);

  const yieldPct = parseNumber(text, [
    /(?:yield|niy|cap rate)\s*[:\-]?\s*([\d.]+)\s*%/i
  ]);

  const units = parseNumber(text, [
    /(?:units|residential units|apartments)\s*[:\-]?\s*([\d,]+)/i
  ]);

  const siteArea = parseNumber(text, [
    /(?:site area|area)\s*[:\-]?\s*([\d,.]+)\s*(?:acres?|ha|sq\s?ft)/i
  ]);

  const assetType = parseText(text, [
    /asset type\s*[:\-]\s*(.+)/i,
    /sector\s*[:\-]\s*(.+)/i,
    /use\s*[:\-]\s*(.+)/i
  ]);

  const tenure = parseText(text, [
    /tenure\s*[:\-]\s*(.+)/i
  ]);

  const planning = parseText(text, [
    /planning\s*[:\-]\s*(.+)/i
  ]);

  const classification = classify(text);
  const highlights = extractHighlights(text);

  return {
    id: `listing-${Date.now()}`,
    sourceFileName,
    sourceType: 'pdf',
    classification,
    title,
    address,
    assetType,
    price,
    summary: highlights[0] || 'Extracted from uploaded brochure.',
    highlights,
    risks: [],
    extractedFields: {
      noi,
      yield: yieldPct,
      tenure,
      siteArea,
      units,
      gdv,
      planning
    },
    confidenceScore: 0.72,
    rawExtraction: { preview: text.slice(0, 4000) },
    createdAt: new Date().toISOString()
  };
}

module.exports = { extractListingFromText };
