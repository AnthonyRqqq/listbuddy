const { signToken, AuthenticationError } = require("../utils/auth");
const bcrypt = require("bcrypt");
const { Category, Item, Location, Note, User } = require("../models");

const resolvers = {
  Query: {
    userById: async (__, { id }) => {
      try {
        return await User.findOne({ _id: id })
          .populate({ path: "items" })
          .populate({ path: "categories" });
      } catch (e) {
        console.error("Error finding user by id: ", e);
        throw new Error("Error finding user by id.");
      }
    },
    categoryById: async (__, { id }) => {
      try {
        return await Category.findOne({ _id: id })
          .populate({ path: "subcategory" })
          .populate({ path: "items" });
      } catch (e) {
        console.error("Error finding by ID", e);
        throw new Error("Error finding by ID");
      }
    },
    itemById: async (__, { id }) => {
      try {
        return await Item.findOne({ _id: id }).populate({
          path: "related_items",
        });
      } catch (e) {
        console.error("Error finding by ID", e);
        throw new Error("Error finding by ID");
      }
    },
  },
  Mutation: {
    createUser: async (parent, { email, password }) => {
      try {
        const user = await User.create({ email: email, password: password });
        const token = signToken(user);
        return { token, user };
      } catch (err) {
        console.error("Error creating user: ", err);
        throw new Error("Could not create user.");
      }
    },

    login: async (parent, { email, password }) => {
      try {
        // Checks for valid user
        const user = await User.findOne({ email });
        if (!user) throw AuthenticationError;

        // Checks for valid password
        const validPassword = await user.isValidPassword(password);
        if (!validPassword) throw AuthenticationError;

        const token = signToken(user);
        return { token, user };
      } catch (err) {
        console.error("Error logging in :", err);
        throw new Error("Could not log in.");
      }
    },
  },
};

module.exports = resolvers;
