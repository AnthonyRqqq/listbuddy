import { useState, useSyncExternalStore } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Dialog } from 'primereact/dialog';
import { Link, useSearchParams } from 'react-router-dom';
import Auth from '../lib/auth';
import { INVENTORY, CREATE_CATEGORY, CREATE_LOCATION, CREATE_ITEM, REPLACE_ITEM, categoryPath } from '../lib/inventory';
import './Inventory.css';

const subscribe = callback => {
  window.addEventListener('listbuddy-auth', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('listbuddy-auth', callback);
    window.removeEventListener('storage', callback);
  };
};

export default function Inventory() {
  const token = useSyncExternalStore(subscribe, () => Auth.getToken());
  const [params] = useSearchParams();
  if (!token || !Auth.loggedIn()) return <p>Log in to view your inventory.</p>;
  if (params.has('shared')) return <p>Shared inventory access is coming in the sharing milestone.</p>;
  return <InventoryContent key={token} />;
}

function Totals({ values }) {
  return values.length ? <ul className="stock-totals">{values.map(total =>
    <li key={total.unit ?? ''}>{total.quantity} {total.unit || '(no unit)'}</li>
  )}</ul> : <p>No stock entries.</p>;
}

function InventoryContent() {
  const { data, loading, error, refetch } = useQuery(INVENTORY, { fetchPolicy: 'no-cache' });
  const [dialog, setDialog] = useState(null);
  const [filter, setFilter] = useState('all');
  const [refreshError, setRefreshError] = useState('');
  const inventory = data?.myInventory;
  async function refresh() {
    try { setRefreshError(''); return await refetch(); }
    catch { setRefreshError('Could not refresh inventory. Try again.'); return null; }
  }
  if (!inventory) return <section className="inventory"><h1>My inventory</h1>
    {loading ? <p role="status">Loading inventory…</p> : <><p role="alert">Could not load inventory. Try again or log in again.</p><button onClick={refresh}>Retry</button></>}
  </section>;
  const { categories, items, locations } = inventory;
  const visible = items.filter(item => filter === 'all' || (filter === 'unassigned' ? !item.category_ids.length : item.category_ids.includes(filter)));
  return <section className="inventory">
    <h1>My inventory</h1>
    {(error || refreshError) && <p role="alert">{refreshError || 'Could not refresh inventory.'} <button onClick={refresh}>Retry</button></p>}
    <div className="inventory-actions">
      <button onClick={() => setDialog({ kind: 'category' })}>Create category</button>
      <button onClick={() => setDialog({ kind: 'location' })}>Create location</button>
      <button onClick={() => setDialog({ kind: 'item' })}>Create item</button>
      <button onClick={refresh} disabled={loading}>Refresh inventory</button>
    </div>
    {(inventory.legacy_item_count > 0 || inventory.legacy_category_count > 0) && <p className="inventory-notice">
      {inventory.legacy_item_count} items and {inventory.legacy_category_count} categories still use the earlier format.
      {' '}Their quantities are excluded from these totals. <Link to="/legacy-lists">View earlier lists</Link>.
    </p>}
    <section aria-label="Inventory totals"><h2>Inventory totals</h2><p>Each item is counted once across all categories. Units are kept separate.</p><Totals values={inventory.totals} /></section>
    <h2>Categories</h2>
    {!categories.length ? <p>No categories yet. Items can remain unassigned.</p> : <ul>{categories.map(category =>
      <li key={category._id}>{categoryPath(category, categories)}</li>
    )}</ul>}
    <h2>Items</h2>
    <label htmlFor="inventory-filter">Show items</label><select id="inventory-filter" value={filter} onChange={event => setFilter(event.target.value)}>
      <option value="all">All items</option><option value="unassigned">Unassigned items</option>
      {categories.map(category => <option key={category._id} value={category._id}>{categoryPath(category, categories)}</option>)}
    </select>
    <p>Category filters show direct memberships. Totals above always cover the whole inventory.</p>
    {!visible.length && <p>No items in this view.</p>}
    <div className="inventory-items">{visible.map(item => <article className="inventory-card" key={item._id} aria-label={item.title}>
      <h3>{item.title}</h3>
      <p>{item.category_ids.length ? item.category_ids.map(id => categoryPath(categories.find(category => category._id === id), categories)).join(', ') : 'Unassigned'}</p>
      <Totals values={item.stock_totals} />
      <ul>{item.stock_entries.map(entry => <li key={entry._id}>
        {locations.find(location => location._id === entry.location_id)?.title || 'Unspecified location'}: {entry.quantity} {entry.unit || '(no unit)'}
      </li>)}</ul>
      <button onClick={() => setDialog({ kind: 'item', item })} aria-label={`Edit ${item.title}`}>Edit item</button>
    </article>)}</div>
    {dialog && <InventoryForm key={`${dialog.kind}-${dialog.item?._id || 'new'}`} dialog={dialog} inventory={inventory}
      onClose={() => setDialog(null)} onSaved={() => { setDialog(null); return refresh(); }} refresh={refresh} />}
  </section>;
}

function draftFor(item) {
  return {
    title: item?.title || '', category_ids: [...(item?.category_ids || [])],
    stock_entries: item ? item.stock_entries.map(entry => ({ quantity: entry.quantity, unit: entry.unit || '', location_id: entry.location_id || '' })) : [],
  };
}

function InventoryForm({ dialog, inventory, onClose, onSaved, refresh }) {
  const client = useApolloClient();
  const [draft, setDraft] = useState(() => draftFor(dialog.item));
  const [version, setVersion] = useState(dialog.item?.version);
  const [parent, setParent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const isItem = dialog.kind === 'item';
  const heading = `${dialog.item ? 'Edit' : 'Create'} ${dialog.kind}`;
  function changeEntry(index, field, value) {
    setDraft(previous => ({ ...previous, stock_entries: previous.stock_entries.map((entry, i) => i === index ? { ...entry, [field]: value } : entry) }));
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const input = { ...draft, stock_entries: draft.stock_entries.map(entry => ({ ...entry, location_id: entry.location_id || null, unit: entry.unit || null })) };
      const mutation = isItem ? (dialog.item ? REPLACE_ITEM : CREATE_ITEM) : dialog.kind === 'category' ? CREATE_CATEGORY : CREATE_LOCATION;
      const variables = isItem ? { input, ...(dialog.item ? { id: dialog.item._id, expected_version: version } : {}) }
        : dialog.kind === 'category' ? { input: { title: draft.title, parent_category_id: parent || null } } : { title: draft.title };
      await client.mutate({ mutation, variables });
      await onSaved();
    } catch (failure) {
      const stale = [...(failure.graphQLErrors || []), ...(failure.errors || [])].some(entry => entry.extensions?.code === 'CONFLICT');
      setConflict(stale);
      setError(stale ? 'This item changed elsewhere. Your draft has not been saved. Reload the latest item before editing again.' : failure.message);
    } finally { setBusy(false); }
  }
  async function reloadLatest() {
    setBusy(true);
    const result = await refresh();
    const latest = result?.data?.myInventory.items.find(item => item._id === dialog.item._id);
    if (latest) { setDraft(draftFor(latest)); setVersion(latest.version); setConflict(false); setError(''); }
    else setError('Could not reload this item. Your draft is still here.');
    setBusy(false);
  }
  return <Dialog visible header={heading} onHide={() => { if (!busy) onClose(); }} style={{ width: 'min(48rem, 95vw)' }}>
    <form onSubmit={submit} className="inventory-form">
      {error && <p role="alert">{error}</p>}
      {conflict && <button type="button" onClick={reloadLatest} disabled={busy}>Discard draft and reload latest item</button>}
      <fieldset disabled={busy}>
        <label>Name<input required value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
        {dialog.kind === 'category' && <><label htmlFor="category-parent">Parent category</label><select id="category-parent" value={parent} onChange={event => setParent(event.target.value)}>
          <option value="">No parent</option>{inventory.categories.map(category => <option key={category._id} value={category._id}>{categoryPath(category, inventory.categories)}</option>)}
        </select></>}
        {isItem && <>
          <p>Editing changes this same item everywhere it appears. Removing a category keeps the item.</p>
          <fieldset><legend>Category memberships</legend>
            {!inventory.categories.length && <p>No categories yet. This item will be unassigned.</p>}
            {inventory.categories.map(category => <label className="inventory-check" key={category._id}>
              <input type="checkbox" checked={draft.category_ids.includes(category._id)} onChange={event => setDraft({ ...draft, category_ids: event.target.checked ? [...draft.category_ids, category._id] : draft.category_ids.filter(id => id !== category._id) })} />
              {categoryPath(category, inventory.categories)}
            </label>)}
          </fieldset>
          <h3>Stock entries</h3><p>Enter nonnegative decimals. Location and unit are optional.</p>
          {!draft.stock_entries.length && <p>No stock entries. Saving will keep an empty stock list.</p>}
          {draft.stock_entries.map((entry, index) => <fieldset className="stock-entry" key={index}>
            <legend>Stock entry {index + 1}</legend>
            <label>Quantity<input required inputMode="decimal" pattern="[0-9]+([.][0-9]+)?" value={entry.quantity} onChange={event => changeEntry(index, 'quantity', event.target.value)} /></label>
            <label>Unit<input value={entry.unit} placeholder="Unspecified" onChange={event => changeEntry(index, 'unit', event.target.value)} /></label>
            <label htmlFor={`stock-location-${index}`}>Location</label><select id={`stock-location-${index}`} value={entry.location_id} onChange={event => changeEntry(index, 'location_id', event.target.value)}>
              <option value="">Unspecified location</option>{inventory.locations.map(location => <option key={location._id} value={location._id}>{location.title}</option>)}
            </select>
            <button type="button" onClick={() => setDraft({ ...draft, stock_entries: draft.stock_entries.filter((_, i) => i !== index) })}>Remove entry {index + 1}</button>
          </fieldset>)}
          <button type="button" onClick={() => setDraft({ ...draft, stock_entries: [...draft.stock_entries, { quantity: '0', unit: '', location_id: '' }] })}>Add stock entry</button>
        </>}
        <div className="inventory-actions"><button type="submit" disabled={conflict}>{busy ? 'Saving…' : 'Save'}</button><button type="button" onClick={onClose}>Cancel</button></div>
      </fieldset>
    </form>
  </Dialog>;
}
