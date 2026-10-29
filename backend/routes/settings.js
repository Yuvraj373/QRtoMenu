const express = require('express');
const Setting = require('../models/Setting');
const { protect } = require('../middleware/auth');

const router = express.Router();

const FIELDS = ['restaurantName', 'tagline', 'themeColor', 'address', 'phone', 'since', 'menuUrl'];

router.get('/', async (req, res) => {
  res.json(await Setting.getSingleton());
});

router.put('/', protect, async (req, res) => {
  const settings = await Setting.getSingleton();
  for (const key of FIELDS) if (req.body[key] !== undefined) settings[key] = req.body[key];
  await settings.save();
  res.json(settings);
});

module.exports = router;
