import { gql } from '@apollo/client';

export const INVENTORY = gql`query MyInventory {
  myInventory {
    categories { _id title parent_category_id }
    locations { _id title }
    items { _id title version category_ids stock_entries { _id quantity unit location_id } stock_totals { quantity unit } }
    totals { quantity unit }
    legacy_item_count legacy_category_count
  }
}`;
export const CREATE_CATEGORY = gql`mutation CreateCategory($input: InventoryCategoryInput!) {
  createInventoryCategory(input: $input) { _id }
}`;
export const CREATE_LOCATION = gql`mutation CreateLocation($title: String!) {
  createInventoryLocation(title: $title) { _id }
}`;
export const CREATE_ITEM = gql`mutation CreateItem($input: InventoryItemInput!) {
  createInventoryItem(input: $input) { _id }
}`;
export const REPLACE_ITEM = gql`mutation ReplaceItem($id: ID!, $expected_version: Int!, $input: InventoryItemInput!) {
  replaceInventoryItem(id: $id, expected_version: $expected_version, input: $input) { _id version }
}`;

export function categoryPath(category, categories) {
  const names = [];
  const seen = new Set();
  let current = category;
  while (current && !seen.has(current._id)) {
    seen.add(current._id);
    names.unshift(current.title);
    current = categories.find(candidate => candidate._id === current.parent_category_id);
  }
  return names.join(' / ');
}
