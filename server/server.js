const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const path = require("path");
const cors = require("cors")

const { typeDefs, resolvers } = require("./schemas");
const connectDatabase = require("./config/connection");
const { signingSecret, requestIdentity } = require('./utils/auth');

const startApolloServer = async ({ port = process.env.PORT || 3001, host, databaseOptions } = {}) => {
  signingSecret();
  const db = await connectDatabase(databaseOptions);
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cors())

  app.use("/graphql", expressMiddleware(server, { context: async ({ req }) => requestIdentity(req) }));

  // Important for MERN Setup: When our application runs from production, it functions slightly differently than in development
  // In development, we run two servers concurrently that work together
  // In production, our Node server runs and delivers our client-side bundle from the dist/ folder
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../client/dist")));

    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../client/dist/index.html"));
    });
  }

  // Important for MERN Setup: Any client-side requests that begin with '/graphql' will be handled by our Apollo Server

  const listener = await new Promise((resolve, reject) => {
    const httpServer = app.listen(port, host, () => resolve(httpServer));
    httpServer.once("error", reject);
  });
  return { listener, server, db };
};

if (require.main === module) {
  startApolloServer().then(({ listener }) => {
    console.log(`API server running on port ${listener.address().port}`);
  }).catch(() => {
    console.error("API startup failed. Check JWT_SECRET, MONGO_URI, database availability, and port configuration.");
    process.exit(1);
  });
}

module.exports = { startApolloServer };
