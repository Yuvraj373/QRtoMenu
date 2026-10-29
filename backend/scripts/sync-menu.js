// Adds any new items from seed.js to the database and fills in missing photos.
// Usage: npm run sync-menu
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { syncMenu } = require('../seed');

mongoose
  .connect(process.env.MONGO_URI)
  .then(syncMenu)
  .then((s) => console.log(`✅ Menu synced — ${s.added} added, ${s.reordered} reordered, ${s.images} photos filled`))
  .catch((err) => {
    console.error('❌', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
