const Item = require('./models/Item');
const { autoImage } = require('./lib/foodImages');

const img = (id) => `https://images.unsplash.com/photo-${id}?w=400&q=80`;

// [category, [[name, priceM (regular), priceL (large) | null, description, photo id?], …]]
// Items without a photo id get an automatic one from lib/foodImages.
const MENU = [
  ['Veg Pizza', [
    ['Mix Veg Cheese Pizza', 99, 149, '', '1513104890138-7c749659a591'],
    ['Onion Capsicum Pizza', 79, 129, '', '1574071318508-1cdbab80d002'],
    ['Farm House Pizza', 109, 169, '', '1565299624946-b28f40a0ae38'],
    ['Garden Pizza', 99, 169, '', '1590947132387-155cc02f3212'],
    ['Onion Capsicum Tomato', 89, 139, '', '1571407970349-bc81e7e96d47'],
  ]],
  ['Corn Pizza', [
    ['Sweet Corn Pizza', 79, 139, '', '1628840042765-356cda07504e'],
    ["Lover's Bite Pizza", 99, 159, '', '1552539618-7eec9b4d1796'],
    ['Baby Corn Pizza', 89, 129, '', '1585238342024-78d387f4a707'],
    ['Delight Corn Pizza', 89, 139, '', '1534308983496-4fabb1a015ee'],
    ['Corn Mushroom Spicy', 89, 139, '', '1544982503-9f984c14501a'],
  ]],
  ['Cheese Pizza', [
    ['Margherita Pizza', 99, 169, '', '1604382354936-07c5d9983bd3'],
    ['7 Cheesy Pizza', 139, 199, '', '1574071318508-1cdbab80d002'],
    ['Cheese Burst Pizza Special', 129, 189, '', '1593560708920-61dd98c46a4e'],
    ['Cheese Lover Pizza', 149, 189, '', '1627626775846-122b778965ae'],
    ['Cheese Overload Pizza', 149, 229, '', '1573821663912-6df460f9c684'],
  ]],
  ['Paneer Pizza', [
    ['Cheese Paneer Pizza', 99, 169, '', '1585238342024-78d387f4a707'],
    ['Corn Paneer Pizza', 109, 179, '', '1513104890138-7c749659a591'],
    ['Veg Paneer Pizza', 119, 189, '', '1565299624946-b28f40a0ae38'],
    ['Paneer Makhani Pizza', 129, 179, '', '1571407970349-bc81e7e96d47'],
    ['Paneer 65 Pizza', 119, 189, '', '1590947132387-155cc02f3212'],
  ]],
  ['Burger', [
    ['Aloo Tikki Burger', 59, null, 'Crispy aloo tikki, onion, tomato & mayo'],
    ['Veg Classic Burger', 69, null, 'Mixed veg patty with lettuce & burger sauce'],
    ['Crispy Veg Burger', 79, null, 'Extra crunchy veg patty with spicy mayo'],
    ['Cheese Burger', 89, null, 'Veg patty topped with a cheese slice'],
    ['Paneer Burger', 99, null, 'Crumb-fried paneer patty with tandoori mayo'],
    ['Maharaja Veg Burger', 129, null, 'Double patty, double cheese, loaded veggies'],
  ]],
  ['Sandwich', [
    ['Veg Sandwich', 49, null, 'Fresh cucumber, tomato, onion & green chutney'],
    ['Veg Grilled Sandwich', 69, null, 'Grilled with mixed veggies & butter'],
    ['Cheese Corn Sandwich', 79, null, 'Sweet corn & cheese, grilled golden'],
    ['Paneer Tikka Sandwich', 99, null, 'Spicy paneer tikka filling, grilled'],
    ['Club Sandwich', 119, null, 'Triple-layer with veggies, cheese & fries'],
  ]],
  ['Momos', [
    ['Veg Steam Momos', 69, null, '6 pcs · served with spicy red chutney'],
    ['Veg Fried Momos', 79, null, '6 pcs · deep fried & crispy'],
    ['Paneer Steam Momos', 89, null, '6 pcs · soft paneer filling'],
    ['Paneer Fried Momos', 99, null, '6 pcs · crispy paneer momos'],
    ['Cheese Corn Steam Momos', 99, null, '6 pcs · cheese & sweet corn filling'],
    ['Kurkure Momos', 109, null, '6 pcs · crunchy cornflake coating'],
    ['Tandoori Momos', 119, null, '6 pcs · tossed in tandoori masala & grilled'],
  ]],
  ['Fries & Sides', [
    ['Salted French Fries', 69, 99, 'Classic golden fries'],
    ['Peri Peri Fries', 79, 109, 'Tossed in spicy peri peri masala'],
    ['Masala Fries', 79, 109, 'Desi chatpata masala'],
    ['Cheesy Fries', 99, 139, 'Loaded with cheese sauce'],
    ['Garlic Bread', 79, null, '4 pcs · garlic butter & herbs'],
    ['Cheese Garlic Bread', 99, null, '4 pcs · with melted cheese'],
  ]],
  ['Cold Coffee', [
    ['Cold Coffee', 49, null, '', '1461023058943-07fcbe16d735'],
    ['Chocolate Shake', 49, null, ''],
    ['Oreo Shake', 79, null, 'Thick shake with crushed Oreo'],
  ]],
  ['Mocktails', [
    ['Virgin Mojito', 69, null, 'Mint, lime & soda'],
    ['Fresh Lime Soda', 49, null, 'Sweet or salted'],
  ]],
];

// Photos that no longer exist on Unsplash; items using them get a fresh automatic photo
const BROKEN_IMAGES = ['1572490122747-3968b75bb8fc'];

const key = (category, name) => `${category.trim().toLowerCase()}|${name.trim().toLowerCase()}`;

// Adds missing menu items, keeps the menu in MENU order and fills in missing photos.
// Never changes names, prices or anything an admin has edited.
async function syncMenu() {
  const existing = await Item.find();
  const byKey = new Map(existing.map((i) => [key(i.category, i.name), i]));
  const seeded = new Set();
  const stats = { added: 0, reordered: 0, images: 0 };

  for (const [ci, [category, items]] of MENU.entries()) {
    for (const [ii, [name, priceM, priceL, description, photo]] of items.entries()) {
      const order = ci * 100 + ii;
      const k = key(category, name);
      seeded.add(k);
      const doc = byKey.get(k);
      if (!doc) {
        await Item.create({ name, priceM, priceL, category, description, image: photo ? img(photo) : '', order });
        stats.added++;
      } else if (doc.order !== order) {
        doc.order = order;
        await doc.save();
        stats.reordered++;
      }
    }
  }

  // Admin-added items still at the default position move to the end of their category (or the menu)
  const categoryIndex = new Map(MENU.map(([c], i) => [c.toLowerCase(), i]));
  let extra = 0;
  for (const doc of existing) {
    if (seeded.has(key(doc.category, doc.name)) || doc.order !== 0) continue;
    const ci = categoryIndex.get(doc.category.trim().toLowerCase());
    doc.order = ci === undefined ? (MENU.length + 1) * 100 + extra : ci * 100 + 50 + extra;
    extra++;
    await doc.save();
    stats.reordered++;
  }

  const all = await Item.find().sort({ order: 1, _id: 1 });
  const used = {};
  for (const doc of all) (used[doc.category] ??= []).push(doc.image);
  for (const doc of all) {
    if (doc.image && !BROKEN_IMAGES.some((b) => doc.image.includes(b))) continue;
    const image = autoImage(doc.name, doc.category, used[doc.category]);
    if (!image) continue;
    doc.image = image;
    used[doc.category].push(image);
    await doc.save();
    stats.images++;
  }
  return stats;
}

// Fill an empty menu with the starter items so a fresh install isn't blank
async function seedIfEmpty() {
  if (await Item.estimatedDocumentCount()) return;
  const stats = await syncMenu();
  console.log(`🌱 Seeded ${stats.added} menu items`);
}

module.exports = seedIfEmpty;
module.exports.syncMenu = syncMenu;
