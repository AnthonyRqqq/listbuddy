
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
    quantity: Int!
    related_items: [Item]
}

type Query {
    userById(id: ID!): User
    categoryById(id: ID!): Category
    allCategories(user_id: ID!): [Category]
    itemById(id: ID!): Item
}

type Mutation {
    login(email: String!, password: String!): Auth
    createUser(email: String!, password: String!): Auth

    createCategory(
        title: String!
        primary_user: ID
        shared_users: [String]
        location: ID
        items: [ID]
    ): Category

    createItem(
        title: String!
        primary_user: ID
        shared_users: [String]
        location: ID
        quantity: Int
    ): Item

    deleteRecord(
        user_id: ID!
        table: String!
        recordId: ID!
    ): ID

    createRecord(user_id: ID, table: String!, data: JSON!): JSON

    updateRecord(user_id: ID!, table: String!, data: JSON!): JSON
}
`;

module.exports = typedefs;
