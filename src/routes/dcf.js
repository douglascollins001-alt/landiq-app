const express = require('express');
const router = express.Router();
const db = require('../db/database');

// POST /api/dcf/calculate — run the full DCF model
router.post('/calculate', (req, res) => {
  try {
    const result = runDCF(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/dcf/save — save a model against an asset
router.post('/save', (req, res) => {
  const { asset_id, name, inputs, outputs } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const result = db.get().prepare(
    'INSERT INTO dcf_models (asset_id, name, inputs, outputs) VALUES (?, ?, ?, ?)'
  ).run(asset_id || null, name, JSON.stringify(inputs), JSON.stringify(outputs));
  res.status(201).json({ id: result.lastInsertRowid, name });
});

// GET /api/dcf/saved — list saved models
router.get('/saved', (req, res) => {
  const models = db.get().prepare(`
    SELECT d.*, a.title as asset_title
    FROM dcf_models d LEFT JOIN assets a ON d.asset_id = a.id
    ORDER BY d.created_at DESC
  `).all();
  res.json(models.map(m => ({ ...m, inputs: JSON.parse(m.inputs), outputs: JSON.parse(m.outputs || 'null') })));
});

// DELETE /api/dcf/saved/:id
router.delete('/saved/:id', (req, res) => {
  db.get().prepare('DELETE FROM dcf_models WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ── DCF ENGINE ────────────────────────────────────────────────────
function runDCF(inputs) {
  const {
    price = 0, noi = 0, holdYears = 5,
    noiGrowthPct = 2.5, exitCapRatePct = 6.0,
    sdltPct = 5.0, otherAcqPct = 1.5, sellCostPct = 2.0,
    ltvPct = 60, interestRatePct = 5.5, amortYears = 25, ioYears = 2,
    discountRatePct = 10.0,
  } = inputs;

  if (!price || !noi) throw new Error('price and noi are required');

  const noiGrowth   = noiGrowthPct   / 100;
  const exitCap     = exitCapRatePct / 100;
  const sdlt        = sdltPct        / 100;
  const otherAcq    = otherAcqPct    / 100;
  const sellCost    = sellCostPct    / 100;
  const ltv         = ltvPct         / 100;
  const iRate       = interestRatePct / 100;
  const discRate    = discountRatePct / 100;

  const totalAcqCost = price * (1 + sdlt + otherAcq);
  const loanAmt      = price * ltv;
  const equity       = totalAcqCost - loanAmt;

  // Build annual NOIs
  const nois = Array.from({ length: holdYears }, (_, i) => noi * Math.pow(1 + noiGrowth, i));

  // Mortgage amortisation
  const monthlyRate = iRate / 12;
  const nMonths     = amortYears * 12;
  const monthlyPmt  = monthlyRate > 0
    ? loanAmt * monthlyRate * Math.pow(1 + monthlyRate, nMonths) / (Math.pow(1 + monthlyRate, nMonths) - 1)
    : loanAmt / nMonths;

  let balance = loanAmt;
  const balances       = [loanAmt];
  const interestByYear = [];
  const principalByYear = [];
  const debtServiceByYear = [];

  for (let y = 0; y < holdYears; y++) {
    if (y < ioYears) {
      const int = balance * iRate;
      interestByYear.push(int);
      principalByYear.push(0);
      debtServiceByYear.push(int);
    } else {
      let totInt = 0, totPrin = 0;
      for (let m = 0; m < 12; m++) {
        const int  = balance * iRate / 12;
        const prin = monthlyPmt - int;
        totInt  += int;
        totPrin += prin;
        balance -= prin;
      }
      interestByYear.push(totInt);
      principalByYear.push(totPrin);
      debtServiceByYear.push(totInt + totPrin);
    }
    balances.push(Math.max(0, balance));
  }

  // Exit
  const exitNOI   = nois[holdYears - 1] * (1 + noiGrowth);
  const exitGross = exitNOI / exitCap;
  const exitNet   = exitGross * (1 - sellCost);
  const exitDebt  = balances[holdYears];
  const exitEquity = exitNet - exitDebt;

  // Cash flow arrays
  const unlevFlows = [
    -totalAcqCost,
    ...nois.map((n, i) => i < holdYears - 1 ? n : n + exitNet),
  ];
  const levFlows = [
    -equity,
    ...nois.map((n, i) => {
      const cf = n - debtServiceByYear[i];
      return i < holdYears - 1 ? cf : cf + exitEquity;
    }),
  ];

  const ulIRR = irr(unlevFlows);
  const lIRR  = irr(levFlows);
  const npv   = levFlows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + discRate, i), 0);
  const totalEquityReturns = levFlows.slice(1).reduce((a, b) => a + b, 0);
  const em = (equity + totalEquityReturns) / equity;
  const dscr = nois[0] / debtServiceByYear[0];

  // Year-by-year table rows
  const yearRows = Array.from({ length: holdYears }, (_, i) => ({
    year: i + 1,
    noi:             round(nois[i]),
    debtService:     round(debtServiceByYear[i]),
    netCashFlow:     round(nois[i] - debtServiceByYear[i]),
    exitProceeds:    i === holdYears - 1 ? round(exitNet) : 0,
    exitDebtRepay:   i === holdYears - 1 ? round(-exitDebt) : 0,
    totalEquityCF:   round(levFlows[i + 1]),
    openingBalance:  round(balances[i]),
    interest:        round(interestByYear[i]),
    principal:       round(principalByYear[i]),
    closingBalance:  round(balances[i + 1]),
    dscr:            r2(nois[i] / debtServiceByYear[i]),
  }));

  // Sensitivity: lIRR across exit cap rates vs NOI growth rates
  const exitCaps = [0.05, 0.055, 0.06, 0.065, 0.07, 0.075];
  const noiGrows = [-0.01, 0.0, 0.01, 0.025, 0.04, 0.055];
  const sensitivity = noiGrows.map(ng =>
    exitCaps.map(ec => {
      const sNOIs = Array.from({ length: holdYears }, (_, i) => noi * Math.pow(1 + ng, i));
      const sExit = (sNOIs[holdYears - 1] * (1 + ng) / ec) * (1 - sellCost) - exitDebt;
      const sFlows = [
        -equity,
        ...sNOIs.map((n, i) => {
          const cf = n - debtServiceByYear[i];
          return i < holdYears - 1 ? cf : cf + sExit;
        }),
      ];
      return r2((irr(sFlows) || 0) * 100);
    })
  );

  return {
    inputs: { price, noi, holdYears, noiGrowthPct, exitCapRatePct, sdltPct, otherAcqPct, sellCostPct, ltvPct, interestRatePct, amortYears, ioYears, discountRatePct },
    summary: {
      totalAcqCost: round(totalAcqCost),
      loanAmt:      round(loanAmt),
      equity:       round(equity),
      exitGross:    round(exitGross),
      exitNet:      round(exitNet),
      exitDebt:     round(exitDebt),
      exitEquity:   round(exitEquity),
    },
    kpis: {
      unleveragedIRR: r2((ulIRR || 0) * 100),
      leveredIRR:     r2((lIRR  || 0) * 100),
      equityMultiple: r2(em),
      npv:            round(npv),
      dscr:           r2(dscr),
      entryYield:     r2((noi / price) * 100),
    },
    yearRows,
    sensitivity: { exitCaps: exitCaps.map(c => r2(c * 100)), noiGrows: noiGrows.map(g => r2(g * 100)), matrix: sensitivity },
  };
}

function irr(cashFlows) {
  let lo = -0.999, hi = 10, mid, n = 0;
  const f = r => cashFlows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + r, i), 0);
  if (f(lo) * f(hi) > 0) return null;
  while (hi - lo > 1e-7 && n++ < 300) { mid = (lo + hi) / 2; f(mid) > 0 ? lo = mid : hi = mid; }
  return mid;
}

const round = n => Math.round(n);
const r2    = n => Math.round(n * 100) / 100;

module.exports = router;
