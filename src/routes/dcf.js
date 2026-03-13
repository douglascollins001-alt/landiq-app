const express = require('express');
const router = express.Router();

function calculateDcf(input) {
  const purchasePrice = Number(input.purchasePrice || 0);
  const noi = Number(input.noi || 0);
  const growthRate = Number(input.growthRate || 0.03);
  const exitYield = Number(input.exitYield || 0.055);
  const holdYears = Number(input.holdYears || 5);
  const discountRate = Number(input.discountRate || 0.08);

  let npv = -purchasePrice;
  let terminalValue = 0;
  const cashFlows = [-purchasePrice];

  for (let year = 1; year <= holdYears; year += 1) {
    const annualNoi = noi * Math.pow(1 + growthRate, year - 1);
    const discounted = annualNoi / Math.pow(1 + discountRate, year);
    npv += discounted;
    cashFlows.push(annualNoi);
    if (year === holdYears) {
      terminalValue = annualNoi / exitYield;
      const discountedTerminal = terminalValue / Math.pow(1 + discountRate, year);
      npv += discountedTerminal;
      cashFlows[year] += terminalValue;
    }
  }

  const totalInflow = cashFlows.slice(1).reduce((a, b) => a + b, 0);
  const equityMultiple = purchasePrice ? totalInflow / purchasePrice : 0;
  const simpleIrr = purchasePrice ? ((totalInflow / purchasePrice) ** (1 / holdYears) - 1) : 0;

  return { input: { purchasePrice, noi, growthRate, exitYield, holdYears, discountRate }, npv, terminalValue, equityMultiple, irr: simpleIrr, cashFlows };
}

router.post('/run', (req, res) => {
  res.json(calculateDcf(req.body || {}));
});

module.exports = router;
