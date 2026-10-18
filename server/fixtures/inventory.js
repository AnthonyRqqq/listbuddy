const { Category, Item, Location } = require('../models');
const stockFixture = require('./stock');

// Only call against an explicitly isolated fixture database.
module.exports = async function inventoryFixture(owner) {
  const root = await Category.create({ title: 'Supplies', primary_user: owner, parent_category: null });
  const child = await Category.create({ title: 'Workshop supplies', primary_user: owner, parent_category: root._id });
  const leaf = await Category.create({ title: 'Consumables', primary_user: owner, parent_category: child._id });
  const a = await Location.create({ title: 'Fixture shelf A', primary_user: owner });
  const b = await Location.create({ title: 'Fixture shelf B', primary_user: owner });
  const item = await Item.create({ ...stockFixture(owner, a._id, b._id), category_ids: [root._id, leaf._id] });
  return { root, child, leaf, item, locations: [a, b] };
};
