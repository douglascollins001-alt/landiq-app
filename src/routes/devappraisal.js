const express = require('express');
const router = express.Router();

function calculateDev(input) {
  const landPrice = Number(input.landPrice || 0);
  const buildCost = Number(input.buildCost || 0);
  const fees = Number(input.fees || 0);
  const finance = Number(input.finance || 0);
  const contingency = Number(input.contingency || 0);
  const gdv = Number(input.gdv || 0);
  const totalCost = landPrice + buildCost + fees + finance + contingency;
  const profit = gdv - totalCost;
  const profitOnCost = totalCost ? profit / totalCost : 0;
  const marginOnGdv = gdv ? profit / gdv : 0;
  return { input: { landPrice, buildCost, fees, finance, contingency, gdv }, totalCost, profit, profitOnCost, marginOnGdv };
}

router.post('/run', (req, res) => {
  res.json(calculateDev(req.body || {}));
});

module.exports = router;
