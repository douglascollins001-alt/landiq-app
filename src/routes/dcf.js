const express = require('express');

const router = express.Router();

function npv(rate, cashflows) {
  return cashflows.reduce((sum, cf, i) => sum + (cf / ((1 + rate) ** i)), 0);
}

function irr(cashflows) {
  let low = -0.99;
  let high = 5;
  for (let i = 0; i < 100; i += 1) {
    const mid = (low + high) / 2;
    const value = npv(mid, cashflows);
    if (Math.abs(value) < 1e-7) return mid;
    if (value > 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function amortisingDebt(principal, annualRate, years) {
  if (!principal || !annualRate || !years) return 0;
  const r = annualRate;
  const n = years;
  return principal * (r / (1 - ((1 + r) ** -n)));
}

router.post('/run', (req, res) => {
  const input = req.body;
  const purchasePrice = Number(input.purchasePrice || 0);
  const year1Noi = Number(input.year1Noi || 0);
  const holdYears = Number(input.holdYears || 5);
  const noiGrowth = Number(input.noiGrowth || 0) / 100;
  const sdlt = Number(input.sdlt || 0) / 100;
  const otherCosts = Number(input.otherCosts || 0) / 100;
  const entryCap = Number(input.entryCap || 0) / 100;
  const exitCap = Number(input.exitCap || 0) / 100;
  const sellingCosts = Number(input.sellingCosts || 0) / 100;
  const ltv = Number(input.ltv || 0) / 100;
  const rate = Number(input.rate || 0) / 100;
  const amortYears = Number(input.amortYears || holdYears || 1);
  const ioPeriod = Number(input.ioPeriod || 0);
  const discountRate = Number(input.discountRate || 8) / 100;

  const acquisitionCost = purchasePrice * (1 + sdlt + otherCosts);
  const loanAmount = purchasePrice * ltv;
  const equity = acquisitionCost - loanAmount;
  const annualDebtPayment = amortisingDebt(loanAmount, rate, amortYears);

  let outstanding = loanAmount;
  const rows = [];
  const unleveredCashflows = [-acquisitionCost];
  const leveredCashflows = [-equity];
  let noi = year1Noi || (purchasePrice * entryCap);
  let minDscr = null;

  for (let year = 1; year <= holdYears; year += 1) {
    const debtService = year <= ioPeriod ? outstanding * rate : annualDebtPayment;
    const interest = outstanding * rate;
    const principal = year <= ioPeriod ? 0 : Math.max(0, debtService - interest);
    outstanding = Math.max(0, outstanding - principal);
    const dscr = debtService > 0 ? noi / debtService : null;
    if (dscr != null) minDscr = minDscr == null ? dscr : Math.min(minDscr, dscr);

    rows.push({ year, noi, debtService, interest, principal, outstanding, dscr });
    unleveredCashflows.push(noi);
    leveredCashflows.push(noi - debtService);
    noi *= 1 + noiGrowth;
  }

  const exitValue = exitCap > 0 ? (rows[rows.length - 1].noi * (1 + noiGrowth)) / exitCap : 0;
  const netSales = exitValue * (1 - sellingCosts);
  unleveredCashflows[unleveredCashflows.length - 1] += netSales;
  leveredCashflows[leveredCashflows.length - 1] += netSales - outstanding;

  const unleveredIrr = irr(unleveredCashflows);
  const leveredIrr = irr(leveredCashflows);
  const equityMultiple = leveredCashflows.slice(1).reduce((a, b) => a + b, 0) / Math.abs(leveredCashflows[0] || 1);
  const npvValue = npv(discountRate, unleveredCashflows);

  const sensitivity = [];
  [-0.005, 0, 0.005].forEach((exitShift) => {
    [-0.01, 0, 0.01].forEach((growthShift) => {
      const adjustedNoi = year1Noi || (purchasePrice * entryCap);
      let tempNoi = adjustedNoi;
      const cfs = [-acquisitionCost];
      for (let year = 1; year <= holdYears; year += 1) {
        cfs.push(tempNoi);
        tempNoi *= 1 + noiGrowth + growthShift;
      }
      const adjustedExitCap = Math.max(0.01, exitCap + exitShift);
      const adjustedExit = cfs[cfs.length - 1] / adjustedExitCap;
      cfs[cfs.length - 1] += adjustedExit * (1 - sellingCosts);
      sensitivity.push({ exitCap: adjustedExitCap * 100, growth: (noiGrowth + growthShift) * 100, irr: irr(cfs) * 100 });
    });
  });

  res.json({
    summary: {
      acquisitionCost,
      equity,
      loanAmount,
      exitValue,
      netSales,
      unleveredIrr: unleveredIrr * 100,
      leveredIrr: leveredIrr * 100,
      equityMultiple,
      npv: npvValue,
      minDscr
    },
    annualCashflows: rows,
    sensitivity
  });
});

module.exports = router;
