import { gql } from "@apollo/client";

const baseFields = `
    _id
    date_created
    title
    notes {
        _id
        title
    }
    primary_user{
        _id
        title
    }
    shared_users {
        _id
        title
    }
    location
`;

export const GET_USER_BY_ID = gql`
  query userById($id: ID!) {
    userById(id: $id) {
      _id
      date_created
      title
      items {
        _id
        title
      }
      categories {
        _id
        title
      }
    }
  }
`;

export const GET_CATEGORY_BY_ID = gql`
  query categoryById($id: ID!) {
    categoryById(id: $id) {
      ${baseFields}
      subcategory {
        _id
        title
      }
      items {
        _id 
        title
      }
    }
  }
`;

export const GET_ITEM_BY_ID = gql`
  query itemById($id: ID!) {
    itemById(id: $id) {
      ${baseFields}
      quantity
      related_items {
        _id
        title
      }
    }
  }
`;
