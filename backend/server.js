require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const seedIfEmpty = require('./seed');

for (const key of ['MONGO_URI', 'JWT_SECRET', 'ADMIN_PASSWORD']) {
  if (!process.env[key]) {
    console.error(`❌ Missing ${key} in backend/.env`);
    process.exit(1);
  }
}

if (/<db_(username|password)>/.test(process.env.MONGO_URI)) {
  console.error("❌ MONGO_URI still has the Atlas placeholders <db_username>/<db_password> — replace them with your real database user in backend/.env");
  process.exit(1);
}

const isProd = process.env.NODE_ENV === 'production';

if (isProd && (process.env.ADMIN_PASSWORD.length < 10 || process.env.ADMIN_PASSWORD === 'admin123')) {
  console.error('❌ ADMIN_PASSWORD is too weak for production — use at least 10 characters');
  process.exit(1);
}

const app = express();
// Hosting platforms (Render, Railway, Nginx…) sit behind a proxy; needed for correct client IPs in rate limiting
app.set('trust proxy', 1);
// CSP off: the menu loads item images from any URL the admin pastes
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
// CLIENT_URL (comma separated) restricts which sites may call the API; unset = allow all (dev)
const allowed = process.env.CLIENT_URL?.split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors(allowed?.length ? { origin: allowed } : {}));
app.use(express.json({ limit: '1mb' }));

// Used by Render to check the service is up
app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// In production the built frontend is served from here, so the QR code only needs one URL
const dist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get(/.*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  app.get('/', (req, res) => res.send('API is running...'));
}

// Express 5 forwards rejected async handlers here
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected Successfully!');
    await seedIfEmpty();
  })
  .catch(err => console.log('❌ DB Error:', err.message));

const PORT = process.env.PORT || 5000;
// Express 5 passes listen errors (e.g. port already in use) to this callback
app.listen(PORT, (err) => {
  if (err) {
    console.error(`❌ Could not start on port ${PORT}: ${err.message}`);
    process.exit(1);
  }
  console.log(`🚀 Server running on port ${PORT}`);
});
