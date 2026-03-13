const express = require('express');
const { getCollection, setCollection } = require('../lib/store');
const router = express.Router();

router.get('/', (_req, res) => res.json(getCollection('portfolio')));
router.post('/', (req, res) => {
  const items = getCollection('portfolio');
  const item = { id: `asset-${Date.now()}`, ...req.body };
  items.unshift(item);
  setCollection('portfolio', items);
  res.status(201).json(item);
});

module.exports = router;
