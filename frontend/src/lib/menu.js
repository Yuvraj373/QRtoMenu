const ICONS = [
  [/momo|dumpling/i, '🥟'],
  [/pizza/i, '🍕'],
  [/burger/i, '🍔'],
  [/coffee|tea|chai/i, '☕'],
  [/shake|smoothie|drink|beverage|juice|cold|mocktail|mojito|soda/i, '🥤'],
  [/dessert|sweet|cake|ice ?cream/i, '🍰'],
  [/pasta/i, '🍝'],
  [/sandwich/i, '🥪'],
  [/fries|starter|snack/i, '🍟'],
  [/noodle|chinese/i, '🍜'],
  [/garlic|bread/i, '🥖'],
  [/combo|meal/i, '🍱'],
  [/salad/i, '🥗'],
];

export const categoryIcon = (name = '') => ICONS.find(([re]) => re.test(name))?.[1] || '🍽️';

export const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Groups items by category, keeping categories in the order they first appear
export function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  }
  return [...groups].map(([category, list]) => ({ category, id: slugify(category), icon: categoryIcon(category), items: list }));
}

export const formatPrice = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
