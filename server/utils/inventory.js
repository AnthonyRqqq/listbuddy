const { GraphQLError } = require('graphql');
const { Category, Item, Location, User } = require('../models');
const { AuthenticationError } = require('./auth');

async function requireOwner(context) {
  if (!context?.userId || !await User.exists({ _id: context.userId })) throw AuthenticationError;
  return context.userId;
}

function title(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Title must not be blank.');
  return value.trim();
}

function itemData(input) {
  return {
    title: title(input.title),
    category_ids: input.category_ids,
    stock_entries: input.stock_entries.map(entry => ({
      quantity: entry.quantity, unit: entry.unit, location: entry.location_id,
    })),
  };
}

async function canonicalCategories(ids, owner) {
  const count = await Category.countDocuments({
    _id: { $in: ids }, primary_user: owner, parent_category: { $exists: true },
  });
  if (count !== ids.length) throw new Error('Categories must be unique, owned, and migrated before linking.');
}

const mutations = {
  createInventoryCategory: async (_, { input }, context) => {
    const owner = await requireOwner(context);
    return Category.create({ title: title(input.title), primary_user: owner, parent_category: input.parent_category_id ?? null });
  },
  createInventoryLocation: async (_, { title: value }, context) => {
    const owner = await requireOwner(context);
    return Location.create({ title: title(value), primary_user: owner });
  },
  createInventoryItem: async (_, { input }, context) => {
    const owner = await requireOwner(context);
    await canonicalCategories(input.category_ids, owner);
    return Item.create({ ...itemData(input), primary_user: owner });
  },
  replaceInventoryItem: async (_, { id, expected_version, input }, context) => {
    const owner = await requireOwner(context);
    const item = await Item.findOne({ _id: id, primary_user: owner });
    if (!item) throw new Error('Item not found in your inventory.');
    if (item.stock_entries === undefined || item.category_ids === undefined) throw new Error('Item requires migration before editing.');
    if (expected_version < 0 || item.__v !== expected_version) throw conflict();
    await canonicalCategories(input.category_ids, owner);
    item.set(itemData(input));
    await item.validate();
    const data = item.toObject();
    // Validation precedes a single atomic compare-and-set. No stale write can win.
    const updated = await Item.findOneAndUpdate({ _id: id, primary_user: owner, __v: expected_version }, {
      $set: { title: data.title, category_ids: data.category_ids, stock_entries: data.stock_entries },
      $inc: { __v: 1 },
    }, { new: true });
    if (!updated) throw conflict();
    return updated;
  },
};

function conflict() {
  return new GraphQLError('This item changed. Reload it before saving again.', { extensions: { code: 'CONFLICT' } });
}

module.exports = { requireOwner, mutations };
