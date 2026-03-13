const express = require('express');
const path = require('path');
const { ensureDb } = require('./lib/store');

const listingsRoute = require('./routes/listings');
const portfolioRoute = require('./routes/portfolio');
const pipelineRoute = require('./routes/pipeline');
const dcfRoute = require('./routes/dcf');
const devAppraisalRoute = require('./routes/devAppraisal');

ensureDb();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/listings', listingsRoute);
app.use('/api/portfolio', portfolioRoute);
app.use('/api/pipeline', pipelineRoute);
app.use('/api/dcf', dcfRoute);
app.use('/api/dev-appraisal', devAppraisalRoute);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

app.listen(port, () => {
  console.log(`LandIQ running on port ${port}`);
});
