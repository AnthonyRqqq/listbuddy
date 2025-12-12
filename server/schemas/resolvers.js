const { signToken, AuthenticationError } = require("../utils/auth");
const bcrypt = require("bcrypt");
const { Category, Item, Location, Note, User } = require("../models");
const {
  checkData,
  handleRelationalDelete,
  handleRelationalUpdates,
} = require("../utils/resolverlib.js");

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
    allCategories: async (__, { user_id }) => {
      try {
        const data = await Category.find({
          $or: [{ primary_user: user_id }, { shared_users: user_id }],
        })
          .populate({ path: "subcategory" })
          .populate({ path: "items" });

        return data;
      } catch (e) {
        console.error("Error finding categories", e);
        throw new Error("Error finding categories");
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

    deleteRecord: async (
      __,
      { user_id, table, recordId, addtlDelete = [] }
    ) => {
      const Model = await checkData({
        userId: user_id,
        userIdRequired: true,
        primaryUserRequired: true,
        table,
        recordId,
      });

      addtlDelete = [...addtlDelete, { columnId: "notes", table: "Note" }];
      const recordData = Model.findById(recordId);
      await handleRelationalDelete({
        recordData,
        relationalDelete: addtlDelete,
      });

      await Model.findByIdAndDelete(recordId);

      return recordId;
    },

    createRecord: async (__, { user_id, table, data, addtlUpdates = [] }) => {
      const Model = await checkData({ table });

      if (user_id) data = { ...data, primary_user: user_id };

      let newRecord;
      try {
        newRecord = await Model.create({ ...data });
      } catch (e) {
        console.error(e);
        throw new Error(`Error creating new "${table}" record.`);
      }

      try {
        await handleRelationalUpdates({
          relationalUpdates: addtlUpdates,
          recordData: newRecord,
        });
      } catch (e) {
        console.error(e);
      }

      return newRecord;
    },

    updateRecord: async (__, { user_id, table, data }) => {
      const Model = await checkData({ table, user_id });
    },
  },
};

module.exports = resolvers;
