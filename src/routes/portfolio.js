const express = require('express');
const { all, run } = require('../db/database');

const router = express.Router();

router.get('/', async (_req, res) => {
  const rows = await all('SELECT * FROM portfolio_assets ORDER BY id DESC');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, asset_type, price, yield_percent, ltv, status } = req.body;
  const result = await run(
    'INSERT INTO portfolio_assets (name, asset_type, price, yield_percent, ltv, status) VALUES (?, ?, ?, ?, ?, ?)',
    [name, asset_type, price, yield_percent, ltv, status]
  );
  res.json({ id: result.lastID, ...req.body });
});

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM portfolio_assets WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
