const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', '..', 'landiq.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function init() {
  await run(`CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source_file_name TEXT,
    source_type TEXT DEFAULT 'pdf',
    classification TEXT DEFAULT 'unknown',
    address TEXT,
    asset_type TEXT,
    region TEXT,
    agent TEXT,
    price REAL,
    yield_percent REAL,
    noi REAL,
    gdv REAL,
    units INTEGER,
    site_area TEXT,
    nia_sqft REAL,
    planning TEXT,
    tenure TEXT,
    occupancy TEXT,
    wault REAL,
    summary TEXT,
    highlights_json TEXT,
    risks_json TEXT,
    extracted_fields_json TEXT,
    raw_text TEXT,
    confidence_score REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS portfolio_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    asset_type TEXT,
    price REAL,
    yield_percent REAL,
    ltv REAL,
    status TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS pipeline_deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    stage TEXT NOT NULL,
    notes TEXT
  )`);

  const assetCount = await get('SELECT COUNT(*) AS count FROM portfolio_assets');
  if ((assetCount?.count || 0) === 0) {
    await run(
      `INSERT INTO portfolio_assets (name, asset_type, price, yield_percent, ltv, status)
       VALUES
       ('Manchester Retail Park', 'Commercial', 6500000, 6.25, 55, 'Live'),
       ('Leeds BTR Block', 'Residential', 12400000, 4.85, 60, 'Under Offer'),
       ('Bristol Industrial Estate', 'Industrial', 8200000, 5.95, 50, 'Live')`
    );
  }

  const pipelineCount = await get('SELECT COUNT(*) AS count FROM pipeline_deals');
  if ((pipelineCount?.count || 0) === 0) {
    await run(
      `INSERT INTO pipeline_deals (name, stage, notes)
       VALUES
       ('Croydon Mixed-Use Site', 'Prospecting', 'Awaiting OM'),
       ('Salford Logistics Hub', 'Due Diligence', 'Reviewing title pack'),
       ('Birmingham PBSA Block', 'Offer/Legal', 'Heads agreed')`
    );
  }
}

module.exports = { db, run, all, get, init };
