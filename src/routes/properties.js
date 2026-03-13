const express = require('express');
const router = express.Router();

// Demo property data — replace with real HMLR/Planning Portal API calls
const DEMO_PROPERTIES = [
  { id:1, title:'126 Bishopsgate', type:'commercial', postcode:'EC2M 4HH', address:'126 Bishopsgate, London EC2M 4HH', area:'City of London', price:4200000, sqft:8400, tenure:'Freehold', yield_pct:6.4, score:87, riskScore:24, tags:['Freehold','Vacant','PD Right'], titleNum:'EGL123456', lender:'Nationwide Building Society', lastSold:'£3.1m (2018)', planningCount:3, lat:51.5154, lng:-0.0810 },
  { id:2, title:'Former Gasworks Site', type:'land', postcode:'SE1 7PB', address:'Old Kent Road, Southwark SE1 7PB', area:'Southwark', price:8900000, sqft:62000, tenure:'Freehold', yield_pct:0, score:72, riskScore:58, tags:['Strategic Land','OPP','Brownfield'], titleNum:'SGL789012', lender:'Unregistered', lastSold:'£5.2m (2016)', planningCount:1, lat:51.4849, lng:-0.0640 },
  { id:3, title:'47-49 Carnaby Street', type:'residential', postcode:'W1F 9PT', address:'47-49 Carnaby Street, Soho W1F 9PT', area:'Soho/Mayfair', price:2100000, sqft:1800, tenure:'Leasehold 85yr', yield_pct:3.2, score:91, riskScore:15, tags:['Prime West End','Listed','Leasehold'], titleNum:'LN123789', lender:'Barclays Bank PLC', lastSold:'£1.4m (2015)', planningCount:2, lat:51.5136, lng:-0.1381 },
  { id:4, title:'Canary Wharf Office Tower', type:'commercial', postcode:'E14 5LQ', address:'1 Canada Square, Canary Wharf E14 5LQ', area:'Canary Wharf', price:24500000, sqft:45000, tenure:'Freehold', yield_pct:7.1, score:78, riskScore:31, tags:['Grade A Office','Multi-Let','BREEAM Exc'], titleNum:'EGL456789', lender:'Deutsche Bank AG', lastSold:'£18.2m (2020)', planningCount:2, lat:51.5045, lng:-0.0197 },
  { id:5, title:"King's Cross Yard", type:'industrial', postcode:'N1C 4AA', address:"Goods Yard Street, King's Cross N1C 4AA", area:"King's Cross", price:6700000, sqft:28000, tenure:'Freehold', yield_pct:5.2, score:83, riskScore:42, tags:['Industrial','Development Angle','Freehold'], titleNum:'MX234567', lender:'HSBC UK Bank plc', lastSold:'£4.1m (2019)', planningCount:1, lat:51.5320, lng:-0.1230 },
];

// GET /api/properties — search/filter
router.get('/', (req, res) => {
  let results = [...DEMO_PROPERTIES];
  const { q, type, minPrice, maxPrice, minYield } = req.query;

  if (q) {
    const qL = q.toLowerCase();
    results = results.filter(p =>
      p.title.toLowerCase().includes(qL) ||
      p.address.toLowerCase().includes(qL) ||
      p.postcode.toLowerCase().includes(qL) ||
      p.titleNum.toLowerCase().includes(qL)
    );
  }
  if (type) results = results.filter(p => p.type === type);
  if (minPrice) results = results.filter(p => p.price >= +minPrice);
  if (maxPrice) results = results.filter(p => p.price <= +maxPrice);
  if (minYield) results = results.filter(p => p.yield_pct >= +minYield);

  res.json(results);
});

// GET /api/properties/:id
router.get('/:id', (req, res) => {
  const prop = DEMO_PROPERTIES.find(p => p.id === +req.params.id);
  if (!prop) return res.status(404).json({ error: 'Not found' });
  res.json(prop);
});

module.exports = router;
