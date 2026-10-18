const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Types } = require('mongoose');
const { ApolloServer } = require('@apollo/server');
const { Item, Location } = require('../models');
const { typeDefs, resolvers } = require('../schemas');
const { normalizeQuantity, quantityString, stockTotals } = require('../utils/quantities');
const stockFixture = require('../fixtures/stock');

test('decimal input preserves precision and rejects invalid or oversized input', () => {
  assert.equal(normalizeQuantity('000.1000'), '0.1');
  assert.equal(normalizeQuantity('9007199254740993.125'), '9007199254740993.125');
  assert.equal(quantityString(Types.Decimal128.fromString('0.0000001')), '0.0000001');
  for (const value of [-1, 0.1, '', '-1', 'NaN', 'Infinity', '1e3', ' 1 ', '1.', '1,5', '9'.repeat(35), '0.' + '0'.repeat(28) + '1']) {
    assert.throws(() => normalizeQuantity(value));
  }
});

test('totals use exact arithmetic, separate units and deduplicate shared items', () => {
  const item = { _id: 'shared-item', stock_entries: [
    { quantity: '0.1', unit: 'kg' }, { quantity: '0.2', unit: ' kg ' },
    { quantity: '3', unit: 'boxes' }, { quantity: '2.25' }, { quantity: '0.75', unit: '' },
    { quantity: '0', unit: 'KG' },
  ] };
  assert.deepEqual(stockTotals([item, item]), [
    { quantity: '0.3', unit: 'kg' }, { quantity: '3', unit: 'boxes' },
    { quantity: '3', unit: null }, { quantity: '0', unit: 'KG' },
  ]);
  assert.throws(() => stockTotals([{ _id: 'legacy', quantity: 1 }]), /migration/);
  assert.throws(() => stockTotals([{ stock_entries: [] }]), /ID/);
});

test('stock schema validates owners, locations, units and decimal strings', async (t) => {
  const owner = new Types.ObjectId();
  const a = new Types.ObjectId();
  const b = new Types.ObjectId();
  const count = t.mock.method(Location, 'countDocuments', async (filter) => {
    assert.equal(filter.primary_user.toString(), owner.toString());
    assert.equal(filter._id.$in.length, 2);
    return 2;
  });
  const item = new Item(stockFixture(owner, a, b));
  await item.validate();
  assert.equal(item.stock_entries[0].quantity._bsontype, 'Decimal128');
  assert.equal(item.stock_entries[0].unit, 'kg');
  count.mock.mockImplementation(async () => 1);
  await assert.rejects(item.validate(), /belong to the item owner/);
  await assert.rejects(new Item({ title: 'No owner', stock_entries: [] }).validate(), /owner/);
  await assert.rejects(new Item({ title: 'Negative', primary_user: owner, stock_entries: [{ quantity: '-1' }] }).validate());
  await assert.rejects(new Item({ title: 'Numeric', primary_user: owner, stock_entries: [{ quantity: 0.1 }] }).validate());
  await assert.rejects(new Item({ title: 'Bad unit', primary_user: owner, stock_entries: [{ quantity: '1', unit: 5 }] }).validate());
  const legacy = new Item({ title: 'Legacy', quantity: 7 });
  await legacy.validate();
  assert.equal(legacy.stock_entries, undefined);
});

test('GraphQL exposes decimal strings and leaves legacy stock explicitly absent', async () => {
  const item = new Item({ title: 'Stock', primary_user: new Types.ObjectId(), stock_entries: [{ quantity: '0.1' }, { quantity: '0.2' }] });
  const server = new ApolloServer({ typeDefs, resolvers: {
    ...resolvers,
    Query: { ...resolvers.Query, itemById: (_, { id }) => id === 'legacy' ? new Item({ title: 'Legacy' }) : item },
  } });
  try {
    const result = await server.executeOperation({ query: '{ itemById(id: "stock") { stock_entries { quantity unit location_id } stock_totals { quantity unit } } }' });
    assert.equal(result.body.singleResult.errors, undefined);
    assert.equal(result.body.singleResult.data.itemById.stock_entries[0].quantity, '0.1');
    assert.equal(result.body.singleResult.data.itemById.stock_totals[0].quantity, '0.3');
    const legacy = await server.executeOperation({ query: '{ itemById(id: "legacy") { stock_entries { quantity } stock_totals { quantity } } }' });
    assert.equal(legacy.body.singleResult.errors, undefined);
    assert.equal(legacy.body.singleResult.data.itemById.stock_entries, null);
    assert.equal(legacy.body.singleResult.data.itemById.stock_totals, null);
  } finally { await server.stop(); }
});
