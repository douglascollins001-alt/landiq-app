const express = require('express');
const path = require('path');
const db = require('./db/database');

const portfolioRoutes = require('./routes/portfolio');
const pipelineRoutes = require('./routes/pipeline');
const dcfRoutes = require('./routes/dcf');
const propertyRoutes = require('./routes/properties');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/dcf', dcfRoutes);
app.use('/api/properties', propertyRoutes);

// Serve frontend for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Init DB then start
db.init();
app.listen(PORT, () => {
  console.log(`\n✅ LandIQ running at http://localhost:${PORT}\n`);
});
