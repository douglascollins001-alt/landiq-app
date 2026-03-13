const express = require('express');

const router = express.Router();

router.post('/run', (req, res) => {
  const gdvResidential = Number(req.body.gdvResidential || 0);
  const units = Number(req.body.units || 0);
  const avgUnitPrice = Number(req.body.avgUnitPrice || 0);
  const nia = Number(req.body.nia || 0);
  const rent = Number(req.body.rent || 0);
  const capRate = Number(req.body.capRate || 0) / 100;
  const buildCostPsf = Number(req.body.buildCostPsf || 0);
  const resNia = Number(req.body.resNia || 0);
  const contingency = Number(req.body.contingency || 0) / 100;
  const profFees = Number(req.body.profFees || 0) / 100;
  const marketing = Number(req.body.marketing || 0) / 100;
  const saleAgentFee = Number(req.body.saleAgentFee || 0) / 100;
  const landPrice = Number(req.body.landPrice || 0);
  const sdlt = Number(req.body.sdlt || 0) / 100;
  const otherAcq = Number(req.body.otherAcq || 0) / 100;
  const buildRate = Number(req.body.buildRate || 0) / 100;
  const buildPeriodMonths = Number(req.body.buildPeriodMonths || 0);
  const salesPeriodMonths = Number(req.body.salesPeriodMonths || 0);
  const targetProfitOnCost = Number(req.body.targetProfitOnCost || 0) / 100;

  const derivedResGdv = gdvResidential || (units * avgUnitPrice);
  const commercialValue = capRate > 0 ? ((nia * rent) / capRate) : 0;
  const totalGdv = derivedResGdv + commercialValue;

  const baseBuildCost = buildCostPsf * resNia;
  const contingencyCost = baseBuildCost * contingency;
  const profFeeCost = baseBuildCost * profFees;
  const marketingCost = totalGdv * marketing;
  const saleAgentCost = totalGdv * saleAgentFee;
  const acquisitionCosts = landPrice * (sdlt + otherAcq);
  const financeCost = (landPrice + baseBuildCost / 2) * buildRate * ((buildPeriodMonths + salesPeriodMonths) / 12);

  const totalCosts = landPrice + acquisitionCosts + baseBuildCost + contingencyCost + profFeeCost + marketingCost + saleAgentCost + financeCost;
  const profit = totalGdv - totalCosts;
  const profitOnCost = totalCosts > 0 ? profit / totalCosts : 0;
  const profitOnGdv = totalGdv > 0 ? profit / totalGdv : 0;
  const targetProfit = totalCosts * targetProfitOnCost;
  const residualLandValue = totalGdv - (totalCosts - landPrice) - targetProfit;

  res.json({
    summary: {
      totalGdv,
      commercialValue,
      totalCosts,
      profit,
      profitOnCost: profitOnCost * 100,
      profitOnGdv: profitOnGdv * 100,
      residualLandValue,
      targetProfit
    },
    costBreakdown: {
      landPrice,
      acquisitionCosts,
      baseBuildCost,
      contingencyCost,
      profFeeCost,
      marketingCost,
      saleAgentCost,
      financeCost
    }
  });
});

module.exports = router;
