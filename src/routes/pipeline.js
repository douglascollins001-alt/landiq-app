const express = require('express');
const router = express.Router();
const db = require('../db/database');

const STAGES = ['prospecting', 'due_diligence', 'offer_legal', 'exchanged', 'completed', 'dead'];

// GET all deals grouped by stage
router.get('/', (req, res) => {
  const deals = db.get().prepare('SELECT * FROM pipeline ORDER BY created_at DESC').all();
  const grouped = STAGES.reduce((acc, s) => {
    acc[s] = deals.filter(d => d.stage === s);
    return acc;
  }, {});
  const totalValue = deals.filter(d => !['completed','dead'].includes(d.stage))
    .reduce((s, d) => s + (d.guide_price || 0), 0);
  res.json({ grouped, deals, totalValue, stages: STAGES });
});

// POST create deal
router.post('/', (req, res) => {
  const { title, address, postcode, asset_type, guide_price, stage, notes } = req.body;
  if (!title || !address) return res.status(400).json({ error: 'title and address required' });
  if (stage && !STAGES.includes(stage)) return res.status(400).json({ error: `stage must be one of: ${STAGES.join(', ')}` });

  const result = db.get().prepare(`
    INSERT INTO pipeline (title, address, postcode, asset_type, guide_price, stage, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, address, postcode || '', asset_type || 'commercial',
         guide_price || 0, stage || 'prospecting', notes || '');

  const deal = db.get().prepare('SELECT * FROM pipeline WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(deal);
});

// PATCH move stage or update fields
router.patch('/:id', (req, res) => {
  const allowed = ['title', 'address', 'postcode', 'asset_type', 'guide_price', 'stage', 'notes'];
  const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k));
  if (!updates.length) return res.status(400).json({ error: 'No valid fields' });
  if (req.body.stage && !STAGES.includes(req.body.stage)) {
    return res.status(400).json({ error: `Invalid stage` });
  }
  const set = updates.map(([k]) => `${k} = ?`).join(', ');
  db.get().prepare(`UPDATE pipeline SET ${set} WHERE id = ?`).run(...updates.map(([,v]) => v), req.params.id);
  const deal = db.get().prepare('SELECT * FROM pipeline WHERE id = ?').get(req.params.id);
  res.json(deal);
});

// DELETE deal
router.delete('/:id', (req, res) => {
  db.get().prepare('DELETE FROM pipeline WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
