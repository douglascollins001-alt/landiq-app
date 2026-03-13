const express = require('express');
const { all, run } = require('../db/database');

const router = express.Router();

router.get('/', async (_req, res) => {
  const rows = await all('SELECT * FROM pipeline_deals ORDER BY id DESC');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, stage, notes } = req.body;
  const result = await run('INSERT INTO pipeline_deals (name, stage, notes) VALUES (?, ?, ?)', [name, stage, notes || '']);
  res.json({ id: result.lastID, name, stage, notes });
});

module.exports = router;
