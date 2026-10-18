const assert = require('node:assert/strict');
const { signToken } = require('../server/utils/auth');
const { Item, User, Category } = require('../server/models');

module.exports = async function inventoryApiSmoke(url, user, otherUser) {
  const token = signToken(user);
  async function request(query, variables = {}, authorization = `Bearer ${token}`) {
    const response = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorization ? { authorization } : {}) },
      body: JSON.stringify({ query, variables }),
    });
    return response.json();
  }
  async function success(query, variables) {
    const result = await request(query, variables);
    assert.equal(result.errors, undefined, JSON.stringify(result.errors));
    return result.data;
  }
  const categoryMutation = 'mutation($input: InventoryCategoryInput!) { createInventoryCategory(input: $input) { _id title parent_category_id } }';
  const categoryInput = { input: { title: ' API root ' } };
  for (const authorization of ['', 'Bearer malformed']) {
    const rejected = await request(categoryMutation, categoryInput, authorization);
    assert.equal(rejected.errors[0].extensions.code, 'UNAUTHENTICATED');
  }
  const deletedUser = await User.create({ email: 'deleted@example.com', password: 'test-password' });
  const deletedToken = signToken(deletedUser);
  await User.deleteOne({ _id: deletedUser._id });
  assert.equal((await request(categoryMutation, categoryInput, `Bearer ${deletedToken}`)).errors[0].extensions.code, 'UNAUTHENTICATED');
  const root = (await success(categoryMutation, categoryInput)).createInventoryCategory;
  assert.equal(root.title, 'API root');
  const child = (await success(categoryMutation, { input: { title: 'API child', parent_category_id: root._id } })).createInventoryCategory;
  assert.equal(child.parent_category_id, root._id);
  assert.ok((await request(categoryMutation, { input: { title: 'Wrong owner', parent_category_id: root._id } }, `Bearer ${signToken(otherUser)}`)).errors);
  const location = (await success('mutation { createInventoryLocation(title: "API shelf") { _id } }')).createInventoryLocation;
  const createItem = 'mutation($input: InventoryItemInput!) { createInventoryItem(input: $input) { _id version category_ids stock_entries { quantity unit location_id } stock_totals { quantity unit } } }';
  const input = {
    title: 'API stock', category_ids: [root._id, child._id],
    stock_entries: [{ location_id: location._id, quantity: '0.1', unit: 'kg' }, { quantity: '0.2', unit: ' kg ' }, { quantity: '0' }],
  };
  const item = (await success(createItem, { input })).createInventoryItem;
  assert.equal(item.version, 0);
  assert.deepEqual(item.stock_totals, [{ quantity: '0.3', unit: 'kg' }, { quantity: '0', unit: null }]);
  assert.equal(String((await Item.findById(item._id)).primary_user), user.id);
  for (const invalid of [
    { ...input, title: '  ' },
    { ...input, category_ids: [root._id, root._id] },
    { ...input, stock_entries: [{ quantity: '-1' }] },
    { ...input, stock_entries: [{ quantity: 0.1 }] },
    { ...input, primary_user: otherUser.id },
  ]) assert.ok((await request(createItem, { input: invalid })).errors);
  assert.ok((await request(createItem, { input }, `Bearer ${signToken(otherUser)}`)).errors);
  assert.ok((await request(createItem, { input: { ...input, category_ids: [] } }, `Bearer ${signToken(otherUser)}`)).errors);
  assert.ok((await request(createItem, { input: { ...input, stock_entries: [{ quantity: '1', location_id: root._id }] } })).errors);
  const legacyCategory = await Category.create({ title: 'Legacy API test', primary_user: user._id });
  assert.ok((await request(categoryMutation, { input: { title: 'Legacy child', parent_category_id: legacyCategory.id } })).errors);
  assert.ok((await request(createItem, { input: { ...input, category_ids: [legacyCategory.id] } })).errors);
  const reusable = (await success(createItem, { input: {
    title: 'Reusable location', category_ids: [], stock_entries: [{ location_id: location._id, quantity: '9007199254740993.125' }],
  } })).createInventoryItem;
  assert.equal(reusable.stock_entries[0].quantity, '9007199254740993.125');

  const replace = 'mutation($id: ID!, $version: Int!, $input: InventoryItemInput!) { replaceInventoryItem(id: $id, expected_version: $version, input: $input) { _id version category_ids stock_entries { quantity } } }';
  const unlinked = { ...input, category_ids: [child._id] };
  const variables = { id: item._id, version: 0, input: unlinked };
  assert.ok((await request(replace, variables, `Bearer ${signToken(otherUser)}`)).errors);
  const raced = await Promise.all([request(replace, variables), request(replace, { ...variables, input: { ...unlinked, title: 'Concurrent edit' } })]);
  assert.equal(raced.filter(result => !result.errors).length, 1);
  assert.equal(raced.find(result => result.errors).errors[0].extensions.code, 'CONFLICT');
  const stored = await Item.findById(item._id);
  assert.equal(stored.__v, 1);
  assert.deepEqual(stored.category_ids.map(String), [child._id]);
  assert.equal(stored.stock_entries[0].quantity.toString(), '0.1');
  assert.equal((await request(replace, variables)).errors[0].extensions.code, 'CONFLICT');
  const emptied = (await success(replace, { id: item._id, version: 1, input: { title: 'Unassigned', category_ids: [], stock_entries: [] } })).replaceInventoryItem;
  assert.equal(emptied.version, 2);
  assert.deepEqual(emptied.category_ids, []);
  assert.deepEqual(emptied.stock_entries, []);
  assert.ok(await Item.exists({ _id: item._id }));

  const deletion = 'mutation($owner: ID!, $table: String!, $id: ID!) { deleteRecord(user_id: $owner, table: $table, recordId: $id) }';
  for (const [table, id] of [['Category', root._id], ['Item', item._id], ['Location', location._id]]) {
    assert.ok((await request(deletion, { owner: user.id, table, id })).errors);
  }
  const forgedLegacy = await request('mutation($owner: ID!) { createRecord(user_id: $owner, table: "Item", data: {title: "Forged"}) }', { owner: otherUser.id });
  assert.equal(forgedLegacy.errors[0].extensions.code, 'UNAUTHENTICATED');
  const legacyMutation = 'mutation($data: JSON!, $updates: JSON) { createRecord(table: "Item", data: $data, addtlUpdates: $updates) }';
  for (const update of [
    { parentTable: 'Category', parentId: root._id, field: 'items' },
    { parentTable: 'Category', parentId: root._id, field: 'parent_category', action: 'set', value: child._id },
    { parentTable: 'Location', parentId: location._id, field: 'primary_user', action: 'set', value: otherUser.id },
    { parentTable: 'User', parentId: otherUser.id, field: 'items' },
  ]) assert.ok((await request(legacyMutation, { data: { title: 'Bypass' }, updates: [update] })).errors);
  assert.equal((await request(legacyMutation, { data: { title: 'Anonymous' } }, '')).errors[0].extensions.code, 'UNAUTHENTICATED');
  console.log('PASS: authenticated inventory creates, decimal writes, ownership, unlinking, stale/concurrent edit rejection, and legacy deletion guards');
};
