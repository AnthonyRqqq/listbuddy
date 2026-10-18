const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ApolloServer } = require("@apollo/server");
const { typeDefs, resolvers } = require("../schemas");
const { User, Item } = require("../models");
const fixtures = require("../fixtures/demo");
const jwt = require("jsonwebtoken");

test("synthetic item validates; missing title is rejected", async () => {
  await new Item(fixtures.item).validate();
  await assert.rejects(new Item({ quantity: 1 }).validate(), /title/);
});

test("signup and login GraphQL contracts with isolated model doubles", async (t) => {
  const user = new User(fixtures.user);
  t.mock.method(User, "create", async ({ email, password }) => {
    assert.equal(email, fixtures.user.email);
    assert.equal(password, fixtures.user.password);
    return user;
  });
  t.mock.method(User, "findOne", async ({ email }) => email === user.email ? user : null);
  t.mock.method(user, "isValidPassword", async (password) => password === fixtures.user.password);
  const server = new ApolloServer({ typeDefs, resolvers });
  try {
    for (const operation of ["createUser", "login"]) {
      const result = await server.executeOperation({
        query: `mutation($email: String!, $password: String!) { ${operation}(email: $email, password: $password) { token user { email } } }`,
        variables: fixtures.user,
      });
      assert.equal(result.body.kind, "single");
      assert.equal(result.body.singleResult.errors, undefined);
      const auth = result.body.singleResult.data[operation];
      assert.equal(auth.user.email, user.email);
      assert.equal(jwt.decode(auth.token).data._id, user.id);
    }
    t.mock.method(console, "error", () => {});
    const rejected = await server.executeOperation({
      query: 'mutation { login(email: "demo@example.com", password: "incorrect") { token } }',
    });
    assert.ok(rejected.body.singleResult.errors?.length);
  } finally {
    await server.stop();
  }
});

test("password comparison checks bcrypt hashes", async () => {
  const bcrypt = require("bcrypt");
  const user = new User({ ...fixtures.user, password: await bcrypt.hash(fixtures.user.password, 4) });
  assert.equal(await user.isValidPassword(fixtures.user.password), true);
  assert.equal(await user.isValidPassword("incorrect"), false);
});
