const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbFile = path.join(dataDir, 'db.json');

const defaultDb = {
  listings: [],
  portfolio: [
    { id: 'asset-1', name: 'Birmingham Retail Park', value: 5250000, yield: 6.2, ltv: 48 },
    { id: 'asset-2', name: 'Leeds Urban Logistics', value: 8750000, yield: 5.4, ltv: 55 }
  ],
  pipeline: [
    { id: 'deal-1', title: 'Manchester Industrial Estate', stage: 'Prospecting' },
    { id: 'deal-2', title: 'Croydon Mixed-Use Scheme', stage: 'Due Diligence' }
  ]
};

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(defaultDb, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
}

function writeDb(data) {
  ensureDb();
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

function getCollection(name) {
  const db = readDb();
  return db[name] || [];
}

function setCollection(name, value) {
  const db = readDb();
  db[name] = value;
  writeDb(db);
  return db[name];
}

function upsertListing(listing) {
  const db = readDb();
  const idx = db.listings.findIndex((x) => x.id === listing.id);
  if (idx >= 0) db.listings[idx] = listing;
  else db.listings.unshift(listing);
  writeDb(db);
  return listing;
}

module.exports = { ensureDb, readDb, writeDb, getCollection, setCollection, upsertListing };
