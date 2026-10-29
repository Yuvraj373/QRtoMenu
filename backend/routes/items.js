const express = require('express');
const mongoose = require('mongoose');
const Item = require('../models/Item');
const { protect } = require('../middleware/auth');
const { autoImage, rankedSuggestions } = require('../lib/foodImages');

const router = express.Router();

const FIELDS = ['name', 'priceM', 'priceL', 'category', 'description', 'image', 'isVeg', 'isSpecial', 'isAvailable', 'order'];

const pick = (body = {}) => {
  const data = {};
  for (const key of FIELDS) if (body[key] !== undefined) data[key] = body[key];
  if (data.priceL === '' || data.priceL === 0) data.priceL = null;
  return data;
};

const validId = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id) ? next() : res.status(400).json({ error: 'Invalid item id' });

const imagesInCategory = async (category, excludeId) =>
  (await Item.find({ category, _id: { $ne: excludeId } }, 'image').lean()).map((i) => i.image);

// `order` is a global menu position: a new item goes after the last item of its category,
// and a new category goes after everything else
async function nextOrder(category) {
  const [lastInCategory] = await Item.find({ category }).sort({ order: -1 }).limit(1).lean();
  if (lastInCategory) return lastInCategory.order + 1;
  const [last] = await Item.find().sort({ order: -1 }).limit(1).lean();
  return last ? Math.ceil((last.order + 1) / 100) * 100 : 0;
}

router.get('/', async (req, res) => {
  const items = await Item.find({}, '-__v -createdAt -updatedAt').sort({ order: 1, _id: 1 });
  res.json(items);
});

// Photo suggestions for the admin form, ranked the same way an empty image is auto-filled
router.get('/image-suggestions', protect, async (req, res) => {
  const name = String(req.query.name || '').slice(0, 100);
  const category = String(req.query.category || '').slice(0, 100);
  res.json({ suggestions: rankedSuggestions(name, category, await imagesInCategory(category, req.query.exclude)) });
});

router.post('/', protect, async (req, res) => {
  const data = pick(req.body);
  if (data.order === undefined && data.category) data.order = await nextOrder(data.category);
  if (!data.image && data.name && data.category) data.image = autoImage(data.name, data.category, await imagesInCategory(data.category));
  const item = await Item.create(data);
  res.status(201).json(item);
});

router.put('/:id', protect, validId, async (req, res) => {
  const existing = await Item.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  const data = pick(req.body);
  const category = data.category ?? existing.category;
  if (data.category && data.category !== existing.category && data.order === undefined) data.order = await nextOrder(category);
  // Clearing the image (or never having one) gets an automatic photo
  if (data.image === '' || (data.image === undefined && !existing.image)) {
    data.image = autoImage(data.name ?? existing.name, category, await imagesInCategory(category, existing._id));
  }
  existing.set(data);
  await existing.save();
  res.json(existing);
});

router.delete('/:id', protect, validId, async (req, res) => {
  const item = await Item.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ ok: true });
});

module.exports = router;
