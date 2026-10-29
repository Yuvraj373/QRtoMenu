// Curated, veg-only Unsplash photos (Unsplash License) used as automatic item thumbnails.
// Groups are checked in order, so specific dishes ("fried momos", "cold coffee") come before
// general ones, and dish types come before ingredients ("Paneer Pizza" is a pizza).
const photo = (id) => `https://images.unsplash.com/photo-${id}?w=400&h=400&fit=crop&q=80`;

const GROUPS = [
  { match: /(fried|fry|kurkure|crispy|pan[- ]?fried|tandoori).*(momo|dumpling)|(momo|dumpling).*(fried|fry|kurkure|crispy|tandoori)/, ids: ['1768326119773-05cae29f4106', '1534422298391-e4f8c172dddb'] },
  { match: /momo|dumpling|dimsum|dim sum/, ids: ['1563245372-f21724e3856d', '1496116218417-1a781b1c416c', '1534422298391-e4f8c172dddb'] },
  { match: /pizza|margherita|farm ?house/, ids: ['1513104890138-7c749659a591', '1574071318508-1cdbab80d002', '1565299624946-b28f40a0ae38', '1590947132387-155cc02f3212', '1571407970349-bc81e7e96d47', '1604382354936-07c5d9983bd3', '1593560708920-61dd98c46a4e'] },
  { match: /burger/, ids: ['1568901346375-23c9450c58cd', '1571091718767-18b5b1457add', '1586190848861-99aa4a171e90', '1550547660-d9450f859349'] },
  { match: /garlic ?bread|bruschetta/, ids: ['1619535860434-ba1d8fa12536', '1573140401552-3fab0b24306f'] },
  { match: /sandwich|toast|sub\b|panini|club/, ids: ['1528735602780-2552fd46c7af', '1539252554453-80ab65ce3586', '1592415499556-74fcb9f18667'] },
  { match: /fries|chips|wedges/, ids: ['1573080496219-bb080dd4f877', '1630384060421-cb20d0e0649d', '1541592106381-b31e9677c0e5'] },
  { match: /spring ?roll/, ids: ['1606525437679-037aca74a3e9'] },
  { match: /samosa|kachori/, ids: ['1601050690597-df0568f70950'] },
  { match: /wrap|roll|frankie|kathi|burrito|shawarma/, ids: ['1626700051175-6818013e1d4f'] },
  { match: /pasta|penne|spaghetti|macaroni|mac ?n/, ids: ['1621996346565-e3dbc646d9a9'] },
  { match: /fried rice|rice|biryani|pulao/, ids: ['1603133872878-684f208fb84b'] },
  { match: /noodle|chowmein|chow mein|maggi|hakka|ramen/, ids: ['1612929633738-8fe44f7ec841', '1585032226651-759b368d7246'] },
  { match: /nachos/, ids: ['1513456852971-30c0b8199d4d'] },
  { match: /salad/, ids: ['1512621776951-a57141f2eefd'] },
  { match: /paneer|tikka/, ids: ['1567188040759-fb8a883dc6d8'] },
  { match: /cold coffee|iced coffee|frappe/, ids: ['1461023058943-07fcbe16d735'] },
  { match: /shake|smoothie|thick ?shake|oreo|kitkat/, ids: ['1577805947697-89e18249d767', '1563805042-7684c019e1cb'] },
  { match: /coffee|cappuccino|latte|espresso|mocha/, ids: ['1561336313-0bd5e0b27ec8'] },
  { match: /\bchai\b|\btea\b/, ids: ['1597318181409-cf64d0b5d8a2', '1576092768241-dec231879fc3'] },
  { match: /mojito|lemonade|nimbu|lime|soda|mocktail|cooler|juice|drink|beverage/, ids: ['1621263764928-df1444c5e859', '1551538827-9c037cb4f32a'] },
  { match: /ice ?cream|sundae|kulfi/, ids: ['1497034825429-c343d7c6a68f'] },
  { match: /brownie|cake|pastry|dessert|sweet/, ids: ['1606313564200-e75d5e30476c'] },
  { match: /waffle|pancake/, ids: ['1562376552-0d160a2f238d'] },
].map((g) => ({ ...g, urls: g.ids.map(photo) }));

const groupFor = (text = '') => GROUPS.find((g) => g.match.test(text.toLowerCase()));

// Photos that fit an item, best first. The item name wins over its category
// ("Peri Peri Fries" in "Sides" → fries), then the category fills in.
function suggestImages(name, category) {
  const byName = groupFor(name);
  const byCategory = groupFor(category);
  return [...new Set([...(byName?.urls || []), ...(byCategory?.urls || [])])];
}

// Picks the least-used photo of the best-matching dish, so items in one category get different
// photos without a "Fried Momos" ever getting a steamed one
function autoImage(name, category, usedImages = []) {
  const options = (groupFor(name) || groupFor(category))?.urls || [];
  if (!options.length) return '';
  const uses = (url) => usedImages.filter((u) => u === url).length;
  return options.reduce((best, url) => (uses(url) < uses(best) ? url : best), options[0]);
}

// Orders suggestions so the one autoImage would pick comes first
function rankedSuggestions(name, category, usedImages = []) {
  const first = autoImage(name, category, usedImages);
  return first ? [first, ...suggestImages(name, category).filter((u) => u !== first)] : [];
}

module.exports = { suggestImages, autoImage, rankedSuggestions };
