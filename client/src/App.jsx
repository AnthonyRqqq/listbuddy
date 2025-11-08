import { Outlet, useLocation } from "react-router-dom";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import Nav from "./Components/Nav";

const client = new ApolloClient({
  link: new HttpLink({ uri: "/graphql" }),
  cache: new InMemoryCache(),
});

export default function App() {
  const currPage = useLocation().pathname;

  return (
    // ApolloProvider wrapper enables access to ApolloClient from anywhere in program
    <ApolloProvider client={client}>
      <header className="header">
        <h3>
          <Nav />
        </h3>
      </header>

      <main className="main">
        <Outlet />
      </main>
    </ApolloProvider>
  );
}
