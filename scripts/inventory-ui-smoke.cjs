const assert = require('node:assert/strict');
const { Item } = require('../server/models');
const { signToken } = require('../server/utils/auth');

module.exports = async function inventoryUiSmoke(page, baseURL, user) {
  await page.goto(`${baseURL}/lists`);
  await page.getByText('No items in this view.', { exact: true }).waitFor();
  async function create(kind, name, parent) {
    await page.getByRole('button', { name: `Create ${kind}`, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: `Create ${kind}`, exact: true });
    await dialog.getByLabel('Name', { exact: true }).fill(name);
    if (parent) await dialog.getByLabel('Parent category').selectOption({ label: parent });
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
  }
  await create('category', 'Supplies');
  await create('category', 'Workshop', 'Supplies');
  await create('location', 'Shelf A');
  await create('location', 'Shelf B');
  await page.getByRole('button', { name: 'Create item', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Create item', exact: true });
  await dialog.getByLabel('Name', { exact: true }).fill('Decimal supplies');
  await dialog.getByRole('checkbox', { name: 'Supplies', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Supplies / Workshop', exact: true }).check();
  for (const [index, quantity, unit, location] of [[1, '0.1', 'kg', 'Shelf A'], [2, '0.2', 'kg', 'Shelf B'], [3, '2.25', '', 'Unspecified location']]) {
    await dialog.getByRole('button', { name: 'Add stock entry' }).click();
    const entry = dialog.getByRole('group', { name: `Stock entry ${index}`, exact: true });
    await entry.getByLabel('Quantity').fill(quantity);
    await entry.getByLabel('Unit', { exact: true }).fill(unit);
    await entry.getByLabel('Location', { exact: true }).selectOption({ label: location });
  }
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  const card = page.getByRole('article', { name: 'Decimal supplies', exact: true });
  await card.getByText('0.3 kg', { exact: true }).waitFor();
  await page.getByRole('region', { name: 'Inventory totals' }).getByText('0.3 kg', { exact: true }).waitFor();
  assert.equal(await card.count(), 1);
  await page.reload();
  await card.getByText('0.3 kg', { exact: true }).waitFor();
  await page.getByLabel('Show items').selectOption({ label: 'Supplies / Workshop' });
  await card.waitFor();

  await card.getByRole('button', { name: 'Edit Decimal supplies' }).click();
  dialog = page.getByRole('dialog', { name: 'Edit item', exact: true });
  const current = await Item.findOne({ primary_user: user._id, title: 'Decimal supplies' });
  const input = {
    title: current.title, category_ids: current.category_ids.map(String),
    stock_entries: [{ quantity: '4.5', unit: 'kg' }],
  };
  const response = await fetch(`${baseURL}/graphql`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', authorization: `Bearer ${signToken(user)}` },
    body: JSON.stringify({ query: 'mutation($id: ID!, $version: Int!, $input: InventoryItemInput!) { replaceInventoryItem(id: $id, expected_version: $version, input: $input) { version } }', variables: { id: current.id, version: current.__v, input } }),
  });
  assert.equal((await response.json()).errors, undefined);
  await dialog.getByLabel('Name', { exact: true }).fill('Stale draft');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await dialog.getByRole('alert').filter({ hasText: 'changed elsewhere' }).waitFor();
  assert.equal(await dialog.getByLabel('Name', { exact: true }).inputValue(), 'Stale draft');
  await dialog.getByRole('button', { name: 'Discard draft and reload latest item' }).click();
  await dialog.getByRole('group', { name: 'Stock entry 1', exact: true }).getByLabel('Quantity').waitFor();
  await page.waitForFunction(() => document.querySelector('[role="dialog"] input[inputmode="decimal"]')?.value === '4.5');
  assert.equal(await dialog.getByLabel('Name', { exact: true }).inputValue(), 'Decimal supplies');
  await dialog.getByRole('checkbox', { name: 'Supplies', exact: true }).uncheck();
  await dialog.getByRole('checkbox', { name: 'Supplies / Workshop', exact: true }).uncheck();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByLabel('Show items').selectOption('unassigned');
  await card.getByText('Unassigned', { exact: true }).waitFor();
  const unlinked = await Item.findById(current._id);
  assert.deepEqual(unlinked.category_ids.map(String), []);
  assert.equal(unlinked.stock_entries[0].quantity.toString(), '4.5');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await card.getByRole('button', { name: 'Edit Decimal supplies' }).click();
  await dialog.getByRole('button', { name: 'Remove entry 1' }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await card.getByText('No stock entries.', { exact: true }).waitFor();
  assert.equal((await Item.findById(current._id)).stock_entries.length, 0);
  await page.setViewportSize({ width: 1280, height: 720 });
  console.log('PASS: inventory UI nesting, reusable locations, mixed decimals, deduplicated totals, persistence, conflict reload, unlinking, empty stock, and mobile width');
};
