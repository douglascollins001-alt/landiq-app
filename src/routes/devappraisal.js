const express = require('express');
const router = express.Router();
const db = require('../db/database');

// POST /api/devappraisal/calculate
router.post('/calculate', (req, res) => {
  try {
    const result = runDevAppraisal(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/devappraisal/save
router.post('/save', (req, res) => {
  const { name, inputs, outputs } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  // Store in dcf_models table reusing same structure
  const result = db.get().prepare(
    'INSERT INTO dcf_models (name, inputs, outputs) VALUES (?, ?, ?)'
  ).run('[DEV] ' + name, JSON.stringify(inputs), JSON.stringify(outputs));
  res.status(201).json({ id: result.lastInsertRowid, name });
});

function runDevAppraisal(i) {
  const {
    // GDV
    units = 0, avgUnitPrice = 0, commercialNIA = 0, commercialRent = 0, commercialYield = 6,
    // Costs
    buildCostPerSqft = 0, resNIA = 0, contingencyPct = 5,
    professionalFeesPct = 12, marketingPct = 3, saleAgentPct = 1.5,
    // Finance
    landPrice = 0, sdltPct = 5, otherAcqPct = 1.5,
    buildFinanceRatePct = 7, buildPeriodMonths = 18, salesPeriodMonths = 6,
    // Profit
    targetProfitOnCostPct = 20,
  } = i;

  // GDV
  const resGDV        = units * avgUnitPrice;
  const commercialGDV = commercialNIA > 0 ? (commercialRent * commercialNIA) / (commercialYield / 100) : 0;
  const totalGDV      = resGDV + commercialGDV;

  // Build costs
  const buildCost     = buildCostPerSqft * resNIA;
  const contingency   = buildCost * (contingencyPct / 100);
  const profFees      = buildCost * (professionalFeesPct / 100);
  const totalBuild    = buildCost + contingency + profFees;

  // Sales & marketing
  const marketing     = totalGDV * (marketingPct / 100);
  const saleAgent     = totalGDV * (saleAgentPct / 100);

  // Land costs
  const sdlt          = landPrice * (sdltPct / 100);
  const otherAcq      = landPrice * (otherAcqPct / 100);
  const totalLandCost = landPrice + sdlt + otherAcq;

  // Finance cost (simple — interest on 60% avg drawn build cost over build period, then sales period)
  const avgDrawn      = totalBuild * 0.6;
  const financeRate   = buildFinanceRatePct / 100;
  const buildFinance  = avgDrawn * financeRate * (buildPeriodMonths / 12);
  const salesFinance  = totalBuild * financeRate * (salesPeriodMonths / 12);
  const totalFinance  = buildFinance + salesFinance;

  // Total cost
  const totalCost     = totalBuild + marketing + saleAgent + totalLandCost + totalFinance;

  // Profit & returns
  const profit        = totalGDV - totalCost;
  const profitOnCost  = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const profitOnGDV   = totalGDV > 0  ? (profit / totalGDV)  * 100 : 0;
  const targetProfit  = totalCost * (targetProfitOnCostPct / 100);
  const residualLand  = totalGDV - totalBuild - marketing - saleAgent - totalFinance - targetProfit - (landPrice * (sdltPct + otherAcqPct) / 100);

  // Viability
  const viable = profitOnCost >= targetProfitOnCostPct;

  const r = n => Math.round(n);
  const r2 = n => Math.round(n * 100) / 100;

  return {
    inputs: i,
    gdv: { resGDV: r(resGDV), commercialGDV: r(commercialGDV), totalGDV: r(totalGDV) },
    costs: {
      buildCost: r(buildCost), contingency: r(contingency), profFees: r(profFees),
      totalBuild: r(totalBuild), marketing: r(marketing), saleAgent: r(saleAgent),
      landPrice: r(landPrice), sdlt: r(sdlt), otherAcq: r(otherAcq),
      totalLandCost: r(totalLandCost), totalFinance: r(totalFinance), totalCost: r(totalCost),
    },
    returns: {
      profit: r(profit), profitOnCost: r2(profitOnCost), profitOnGDV: r2(profitOnGDV),
      targetProfit: r(targetProfit), residualLand: r(residualLand), viable,
    },
  };
}

module.exports = router;
