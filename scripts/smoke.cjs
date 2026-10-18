const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
process.env.JWT_SECRET = require('node:crypto').randomBytes(32).toString('hex');
const { chromium } = require('@playwright/test');
const { startApolloServer } = require('../server/server');
const { seedDemo } = require('../server/seeders/seed');
const { User, Category, Item, Location } = require('../server/models');
const stockFixture = require('../server/fixtures/stock');
const inventoryFixture = require('../server/fixtures/inventory');
const { stockTotals } = require('../server/utils/quantities');

// Never accept a database name from arguments/environment. Only drop our own
// randomly named database after proving it had no collections before this run.
const dbName = `listbuddy_test_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
let app, browser, ownsDatabase = false;
const timeout = setTimeout(() => { console.error('Smoke test timed out; inspect leftover test database: ' + dbName); process.exit(1); }, 180000);

async function run() {
  console.log('Isolated test database: ' + dbName);
  process.env.NODE_ENV = 'production';
  app = await startApolloServer({ port: 0, host: '127.0.0.1', databaseOptions: { dbName, autoCreate: false, autoIndex: false } });
  assert.equal(app.db.name, dbName);
  assert.deepEqual(await app.db.db.listCollections().toArray(), []);
  ownsDatabase = true;
  const seeded = await seedDemo();
  assert.equal((await Item.findById(seeded.item._id)).quantity, 24);
  await assert.rejects(seedDemo(), /not empty/);
  console.log('PASS: isolated database seed, persistence, and nonempty-database refusal');

  const secondLocation = await Location.create({ title: 'Shelf B', primary_user: seeded.user._id });
  const stock = await Item.create(stockFixture(seeded.user._id, seeded.location._id, secondLocation._id));
  const stored = await Item.findById(stock._id);
  assert.equal(stored.stock_entries[0].quantity._bsontype, 'Decimal128');
  assert.deepEqual(stockTotals([stored, stored]), [
    { quantity: '0.3', unit: 'kg' }, { quantity: '3.5', unit: 'boxes' }, { quantity: '2.25', unit: null },
  ]);
  const otherUser = await User.create({ email: 'other@example.com', password: 'test-password' });
  await assert.rejects(Item.create(stockFixture(otherUser._id, seeded.location._id, secondLocation._id)), /belong to the item owner/);
  const stockResponse = await fetch(`http://127.0.0.1:${app.listener.address().port}/graphql`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'query($id: ID!) { itemById(id: $id) { stock_entries { quantity unit location_id } stock_totals { quantity unit } } }', variables: { id: stock.id } }),
  });
  const stockResult = await stockResponse.json();
  assert.equal(stockResult.errors, undefined);
  assert.equal(stockResult.data.itemById.stock_entries[0].quantity, '0.1');
  assert.equal(stockResult.data.itemById.stock_totals[0].quantity, '0.3');
  console.log('PASS: multi-location Decimal128 persistence, exact per-unit totals, GraphQL strings, and location-owner validation');

  const inventory = await inventoryFixture(seeded.user._id);
  const relationshipResponse = await fetch(`http://127.0.0.1:${app.listener.address().port}/graphql`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `query($id: ID!) {
      categoryById(id: $id) {
        member_items { _id category_ids stock_entries { quantity unit } }
        child_categories { child_categories { member_items { _id category_ids stock_entries { quantity unit } } } }
      }
    }`, variables: { id: inventory.root.id } }),
  });
  const relationshipResult = await relationshipResponse.json();
  assert.equal(relationshipResult.errors, undefined);
  const rootView = relationshipResult.data.categoryById;
  const overlappingItems = [...rootView.member_items, ...rootView.child_categories[0].child_categories[0].member_items];
  assert.equal(overlappingItems.length, 2);
  assert.deepEqual(overlappingItems[0].category_ids, [inventory.root.id, inventory.leaf.id]);
  assert.deepEqual(stockTotals(overlappingItems), stockTotals([stored]));
  inventory.root.parent_category = inventory.leaf._id;
  await assert.rejects(inventory.root.save(), /cycles/);
  assert.equal((await Category.findById(inventory.root._id)).parent_category, null);
  await assert.rejects(Item.create({ title: 'Invalid membership', primary_user: otherUser._id, category_ids: [inventory.root._id] }), /item owner/);
  console.log('PASS: persisted nested categories, shared membership, deduplicated mixed-unit totals, cycle and owner checks');
  await require('./inventory-smoke.cjs')(`http://127.0.0.1:${app.listener.address().port}/graphql`, seeded.user, otherUser);

  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const baseURL = `http://127.0.0.1:${app.listener.address().port}`;
  await page.goto(`${baseURL}/lists`);
  await page.getByRole('link', { name: 'Login / Signup' }).click();
  await page.getByPlaceholder('Email', { exact: true }).fill('demo@example.com');
  await page.getByPlaceholder('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByText('Invalid email or password. Please try again.').waitFor();
  await page.getByRole('button', { name: 'Not signed up yet? Click here!' }).click();
  await page.getByRole('dialog', { name: 'Login', exact: true }).waitFor({ state: 'hidden' });
  await page.getByPlaceholder('Email', { exact: true }).fill('smoke@example.com');
  await page.getByPlaceholder('Password', { exact: true }).fill('smoke-test-password');
  await page.getByPlaceholder('Verify Password', { exact: true }).fill('smoke-test-password');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByRole('link', { name: 'Logout', exact: true }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Create List', exact: true }).click();
  await page.getByRole('dialog').locator('input[name="Name"]').fill('Smoke inventory');
  await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByRole('heading', { name: 'Smoke inventory' }).waitFor();
  await page.locator('button:has(.pi-plus)').click();
  await page.getByRole('dialog').locator('input[name="Name"]').fill('Smoke washers');
  await page.getByRole('dialog').locator('input[name="Quantity"]').fill('7');
  await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByText('Smoke washers', { exact: true }).waitFor();
  await page.reload();
  await page.getByText('Smoke washers', { exact: true }).waitFor();
  const user = await User.findOne({ email: 'smoke@example.com' });
  const item = await Item.findOne({ primary_user: user._id, title: 'Smoke washers' });
  assert.equal(item.quantity, 7);
  console.log('PASS: rejected login, signup/login, category/item creation, and reload persistence');

  await page.locator('button:has(.pi-trash)').last().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByText('Smoke washers', { exact: true }).waitFor({ state: 'hidden' });
  assert.equal(await Item.findById(item._id), null);
  await page.locator('button:has(.pi-trash)').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByRole('heading', { name: 'Smoke inventory' }).waitFor({ state: 'hidden' });
  assert.equal(await Category.countDocuments({ primary_user: user._id }), 0);
  await page.getByRole('link', { name: 'Logout', exact: true }).click();
  await page.getByRole('link', { name: 'Login / Signup' }).click();
  await page.getByPlaceholder('Email', { exact: true }).fill('smoke@example.com');
  await page.getByPlaceholder('Password', { exact: true }).fill('smoke-test-password');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByRole('link', { name: 'Logout', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: item/category deletion and returning-user login; no browser exceptions');
}

run().catch(error => {
  console.error(error.stack);
  process.exitCode = 1;
}).finally(async () => {
  try {
    if (browser) await browser.close();
    if (app) {
      await new Promise(resolve => app.listener.close(resolve));
      await app.server.stop();
      if (ownsDatabase && app.db.name === dbName && /^listbuddy_test_[a-f0-9]{20}$/.test(dbName)) {
        await app.db.dropDatabase();
        console.log('Removed only this run\'s isolated test database.');
      }
      await app.db.close();
    }
  } finally { clearTimeout(timeout); }
});
