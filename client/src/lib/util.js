import Queries from "./queries";
import { useQuery } from "@apollo/client/react";

// Regex for checking valid email addresses
export function validateEmail(email) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

export function executeQuery({ queryName, skip, variables }) {
  if (!queryName) throw new Error("Query name is required");

  const query = Queries[queryName];

  const data = useQuery(query, {
    variables,
    skip,
  });

  return data;
}
