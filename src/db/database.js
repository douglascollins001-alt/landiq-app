const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../landiq.db');
let db;

function init() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      address     TEXT NOT NULL,
      postcode    TEXT,
      asset_type  TEXT DEFAULT 'commercial',
      tenure      TEXT DEFAULT 'Freehold',
      price       REAL,
      noi         REAL,
      ltv         REAL DEFAULT 60,
      status      TEXT DEFAULT 'active',
      notes       TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pipeline (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      address       TEXT NOT NULL,
      postcode      TEXT,
      asset_type    TEXT DEFAULT 'commercial',
      guide_price   REAL,
      stage         TEXT DEFAULT 'prospecting',
      notes         TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dcf_models (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id    INTEGER REFERENCES assets(id) ON DELETE SET NULL,
      name        TEXT NOT NULL,
      inputs      TEXT NOT NULL,
      outputs     TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed demo data if empty
  const count = db.prepare('SELECT COUNT(*) as n FROM assets').get();
  if (count.n === 0) seedDemoData();

  console.log('📦 Database ready:', DB_PATH);
}

function seedDemoData() {
  const insertAsset = db.prepare(`
    INSERT INTO assets (title, address, postcode, asset_type, tenure, price, noi, ltv, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPipeline = db.prepare(`
    INSERT INTO pipeline (title, address, postcode, asset_type, guide_price, stage)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const assets = [
    ['126 Bishopsgate', '126 Bishopsgate, London', 'EC2M 4HH', 'commercial', 'Freehold', 4200000, 268800, 58, 'active'],
    ['Old Kent Road Site', 'Old Kent Road, Southwark', 'SE1 7PB', 'land', 'Freehold', 8900000, 0, 55, 'development'],
    ['47 Carnaby Street', '47-49 Carnaby Street, Soho', 'W1F 9PT', 'residential', 'Leasehold', 2100000, 67200, 40, 'active'],
    ['1 Canada Square', '1 Canada Square, Canary Wharf', 'E14 5LQ', 'commercial', 'Freehold', 24500000, 1739500, 65, 'active'],
    ["King's Cross Yard", "Goods Yard Street, King's Cross", 'N1C 4AA', 'industrial', 'Freehold', 6700000, 348400, 68, 'active'],
  ];
  assets.forEach(a => insertAsset.run(...a));

  const pipeline = [
    ['SE17 Warehouse', 'Bermondsey, SE17', 'SE17 1RJ', 'industrial', 3200000, 'prospecting'],
    ['WC2 Office Suite', 'Holborn, WC2', 'WC2A 1AE', 'commercial', 6500000, 'due_diligence'],
    ['N7 Resi Block', 'Holloway Road, N7', 'N7 6LB', 'residential', 3700000, 'offer_legal'],
    ['SW1 Prime Resi', 'Pimlico, SW1', 'SW1V 2AU', 'residential', 2200000, 'exchanged'],
  ];
  pipeline.forEach(p => insertPipeline.run(...p));

  console.log('🌱 Demo data seeded');
}

function get() {
  if (!db) throw new Error('Database not initialised. Call init() first.');
  return db;
}

module.exports = { init, get };
