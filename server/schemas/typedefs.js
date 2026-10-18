const baseFields = `
    _id: ID
    date_created: String!
    title: String!
    notes: [Note]
    primary_user: User
    shared_users: [User]
    location: Location
`;

const typedefs = `

scalar JSON

type Auth {
    token: ID!
    user: User
}

type User {
    _id: ID
    email: String!
    items: [Item]
    categories: [Category]
}

type Category {
    ${baseFields}
    uses_inventory_model: Boolean!
    parent_category_id: ID
    child_categories: [Category!]
    member_items: [Item!]
    subcategory: [Category]
    items: [Item]
}

type Location {
    ${baseFields}
    related_locations: [Location]
}

type Note {
    ${baseFields}
    text: String!
}

type Item {
    ${baseFields}
    version: Int!
    category_ids: [ID!]
    quantity: Int!
    stock_entries: [StockEntry!]
    stock_totals: [StockTotal!]
    related_items: [Item]
}

type StockEntry {
    _id: ID!
    location_id: ID
    quantity: String!
    unit: String
}

type StockTotal {
    quantity: String!
    unit: String
}

input InventoryCategoryInput {
    title: String!
    parent_category_id: ID
}

input InventoryStockInput {
    location_id: ID
    quantity: String!
    unit: String
}

input InventoryItemInput {
    title: String!
    category_ids: [ID!]!
    stock_entries: [InventoryStockInput!]!
}

type Query {
    myInventory: OwnedInventory!
    userById(id: ID!): User
    categoryById(id: ID!): Category
    allCategories(user_id: ID!): [Category]
    itemById(id: ID!): Item
}

type OwnedInventory {
    categories: [InventoryCategoryView!]!
    items: [InventoryItemView!]!
    locations: [InventoryLocationView!]!
    totals: [StockTotal!]!
    legacy_item_count: Int!
    legacy_category_count: Int!
}

type InventoryCategoryView {
    _id: ID!
    title: String!
    parent_category_id: ID
}

type InventoryLocationView {
    _id: ID!
    title: String!
}

type InventoryItemView {
    _id: ID!
    title: String!
    version: Int!
    category_ids: [ID!]!
    stock_entries: [StockEntry!]!
    stock_totals: [StockTotal!]!
}

type Mutation {
    createInventoryCategory(input: InventoryCategoryInput!): Category!
    createInventoryLocation(title: String!): Location!
    createInventoryItem(input: InventoryItemInput!): Item!
    replaceInventoryItem(id: ID!, expected_version: Int!, input: InventoryItemInput!): Item!
    login(email: String!, password: String!): Auth
    createUser(email: String!, password: String!): Auth

    deleteRecord(
        user_id: ID!
        table: String!
        recordId: ID!
    ): ID

    createRecord(user_id: ID, table: String!, data: JSON!, addtlUpdates: JSON): JSON

    updateRecord(user_id: ID!, table: String!, data: JSON!): JSON
}
`;

module.exports = typedefs;
