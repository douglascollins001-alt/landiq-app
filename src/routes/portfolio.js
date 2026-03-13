const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET all assets with computed metrics
router.get('/', (req, res) => {
  const assets = db.get().prepare(`
    SELECT *, 
      CASE WHEN price > 0 AND noi > 0 THEN ROUND((noi / price) * 100, 2) ELSE NULL END as yield_pct,
      CASE WHEN price > 0 AND ltv > 0 THEN ROUND(price * ltv / 100) ELSE 0 END as loan_amount
    FROM assets ORDER BY created_at DESC
  `).all();

  // Portfolio summary
  const summary = {
    totalAUM: assets.reduce((s, a) => s + (a.price || 0), 0),
    totalNOI: assets.reduce((s, a) => s + (a.noi || 0), 0),
    count: assets.length,
    byType: assets.reduce((acc, a) => {
      acc[a.asset_type] = (acc[a.asset_type] || 0) + (a.price || 0);
      return acc;
    }, {}),
  };

  res.json({ assets, summary });
});

// GET single asset
router.get('/:id', (req, res) => {
  const asset = db.get().prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.json(asset);
});

// POST create asset
router.post('/', (req, res) => {
  const { title, address, postcode, asset_type, tenure, price, noi, ltv, status, notes } = req.body;
  if (!title || !address) return res.status(400).json({ error: 'title and address are required' });

  const result = db.get().prepare(`
    INSERT INTO assets (title, address, postcode, asset_type, tenure, price, noi, ltv, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, address, postcode || '', asset_type || 'commercial', tenure || 'Freehold',
         price || 0, noi || 0, ltv || 60, status || 'active', notes || '');

  const asset = db.get().prepare('SELECT * FROM assets WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(asset);
});

// PATCH update asset
router.patch('/:id', (req, res) => {
  const allowed = ['title', 'address', 'postcode', 'asset_type', 'tenure', 'price', 'noi', 'ltv', 'status', 'notes'];
  const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k));
  if (!updates.length) return res.status(400).json({ error: 'No valid fields provided' });

  const set = updates.map(([k]) => `${k} = ?`).join(', ');
  const vals = updates.map(([, v]) => v);
  db.get().prepare(`UPDATE assets SET ${set} WHERE id = ?`).run(...vals, req.params.id);

  const asset = db.get().prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.json(asset);
});

// DELETE asset
router.delete('/:id', (req, res) => {
  db.get().prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
