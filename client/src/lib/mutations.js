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
    mutation createCategory($title: String!, $primary_user: ID, $shared_users: [String], location: ID, items: [ID]) {
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
