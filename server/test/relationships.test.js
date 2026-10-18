const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Types } = require('mongoose');
const { ApolloServer } = require('@apollo/server');
const { Category, Item } = require('../models');
const { typeDefs, resolvers } = require('../schemas');

test('hierarchy supports deep nesting and rejects cycles, missing ancestors and other owners', async (t) => {
  const owner = new Types.ObjectId();
  const root = new Category({ title: 'Root', primary_user: owner, parent_category: null });
  const records = new Map([[root.id, root]]);
  t.mock.method(Category, 'findById', async id => records.get(String(id)) || null);
  await root.validate();
  let parent = root;
  for (let index = 0; index < 40; index++) {
    const child = new Category({ title: `Level ${index}`, primary_user: owner, parent_category: parent._id });
    await child.validate();
    records.set(child.id, child);
    parent = child;
  }
  root.parent_category = parent._id;
  await assert.rejects(root.validate(), /cycles/);
  root.parent_category = root._id;
  await assert.rejects(root.validate(), /cycles/);
  root.parent_category = new Types.ObjectId();
  await assert.rejects(root.validate(), /must exist/);
  root.parent_category = null;
  root.primary_user = new Types.ObjectId();
  await assert.rejects(parent.validate(), /category owner/);
  root.primary_user = owner;
  root.parent_category = undefined;
  await assert.rejects(parent.validate(), /migration/);
  await assert.rejects(new Category({ title: 'Ownerless', parent_category: null }).validate(), /owner/);
  await new Category({ title: 'Legacy' }).validate();
});

test('canonical membership accepts multiple same-owner categories and rejects invalid links', async (t) => {
  const owner = new Types.ObjectId();
  const ids = [new Types.ObjectId(), new Types.ObjectId()];
  const count = t.mock.method(Category, 'countDocuments', async filter => {
    assert.equal(String(filter.primary_user), String(owner));
    assert.deepEqual(filter._id.$in, ids.map(String));
    return 2;
  });
  const item = new Item({ title: 'Shared membership', primary_user: owner, category_ids: ids });
  await item.validate();
  count.mock.mockImplementation(async () => 1);
  await assert.rejects(item.validate(), /item owner/);
  item.category_ids = [ids[0], ids[0]];
  await assert.rejects(item.validate(), /unique/);
  item.category_ids = [];
  await item.validate();
  await assert.rejects(new Item({ title: 'Ownerless', category_ids: [] }).validate(), /owner/);
  assert.equal(new Item({ title: 'Legacy' }).category_ids, undefined);
});

test('GraphQL reads canonical relationships without reusing legacy arrays', async (t) => {
  const owner = new Types.ObjectId();
  const root = new Category({ title: 'Root', primary_user: owner, parent_category: null });
  const child = new Category({ title: 'Child', primary_user: owner, parent_category: root._id });
  const item = new Item({ title: 'Linked', primary_user: owner, category_ids: [root._id, child._id] });
  t.mock.method(Category, 'find', async filter => {
    assert.equal(String(filter.primary_user), String(owner));
    return String(filter.parent_category) === root.id ? [child] : [];
  });
  t.mock.method(Item, 'find', async filter => {
    assert.equal(String(filter.primary_user), String(owner));
    assert.equal(String(filter.category_ids), root.id);
    return [item];
  });
  const server = new ApolloServer({ typeDefs, resolvers: {
    ...resolvers, Query: { ...resolvers.Query, categoryById: () => root },
  } });
  try {
    const result = await server.executeOperation({ query: '{ categoryById(id: "root") { parent_category_id child_categories { parent_category_id } member_items { category_ids } } }' });
    assert.equal(result.body.singleResult.errors, undefined);
    const category = result.body.singleResult.data.categoryById;
    assert.equal(category.parent_category_id, null);
    assert.equal(category.child_categories[0].parent_category_id, root.id);
    assert.deepEqual(category.member_items[0].category_ids, [root.id, child.id]);
  } finally { await server.stop(); }
});

test('legacy writes cannot bypass canonical relationship validation', async () => {
  for (const field of ['parent_category', 'category_ids', 'stock_entries', 'category_ids.0', 'stock_entries.0.quantity']) {
    await assert.rejects(resolvers.Mutation.createRecord(null, {
      table: 'Item', data: { [field]: [] },
    }), /legacy record API/);
    await assert.rejects(resolvers.Mutation.createRecord(null, {
      table: 'Item', data: {}, addtlUpdates: [{ field }],
    }), /legacy record API/);
  }
});
