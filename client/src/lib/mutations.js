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
    }
    shared_users {
        _id
    }
    location {
      _id
    }
`;

export const LOGIN = gql`
  mutation login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        _id
        email
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
  }
`;

export const CREATE_USER = gql`
  mutation createUser($email: String!, $password: String!) {
    createUser(email: $email, password: $password) {
      token
      user {
        _id
        email
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
  }
`;

export const CREATE_CATEGORY = gql`
    mutation createCategory($title: String!, $primary_user: ID, $shared_users: [String], $location: ID, $items: [ID]) {
        createCategory(title: $title, primary_user: $primary_user, shared_users: $shared_users, location: $location, items: $items) {
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

export const CREATE_ITEM = gql`
    mutation createItem($title: String!, $primary_user: ID, $shared_users: [String], $location: ID, $quantity: Int) {
        createItem(title: $title, primary_user: $primary_user, shared_users: $shared_users, location: $location, quantity: $quantity) {
            ${baseFields}
            quantity
            related_items {
                _id
                title
            }
        }
    }
`;

export const DELETE_RECORD = gql`
  mutation deleteRecord($user_id: ID!, $table: String!, $recordId: ID!) {
    deleteRecord(user_id: $user_id, table: $table, recordId: $recordId)
  }
`;

export const CREATE_RECORD = gql`
  mutation createRecord($user_id: ID, $table: String!, $data: JSON!, $addtlUpdates: JSON) {
  createRecord(user_id: $user_id, table: $table, data: $data, addtlUpdates: $addtlUpdates)
  }
`

export const UPDATE_RECORD = gql`
  mutation updateRecord($user_id: ID!, $table: String!, $data: JSON!) {
    updateRecord(user_id: $user_id, table: $table, data: $data)
  }
`
