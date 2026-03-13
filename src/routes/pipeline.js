const express = require('express');
const { getCollection, setCollection } = require('../lib/store');
const router = express.Router();

router.get('/', (_req, res) => res.json(getCollection('pipeline')));
router.post('/', (req, res) => {
  const items = getCollection('pipeline');
  const item = { id: `deal-${Date.now()}`, ...req.body };
  items.unshift(item);
  setCollection('pipeline', items);
  res.status(201).json(item);
});

module.exports = router;
