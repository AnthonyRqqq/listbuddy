const { signToken, AuthenticationError } = require("../utils/auth");
const bcrypt = require("bcrypt");
const { Category, Item, Location, Note, User } = require("../models");
const { quantityString, stockTotals } = require('../utils/quantities');
const { requireOwner, mutations: inventoryMutations } = require('../utils/inventory');
const {
  checkData,
  handleRelationalDelete,
  handleRelationalUpdates,
} = require("../utils/resolverlib.js");

const resolvers = {
  Category: {
    parent_category_id: category => category.parent_category || null,
    child_categories: async category => category.parent_category === undefined ? null : Category.find({
      parent_category: category._id, primary_user: category.primary_user,
    }),
    member_items: async category => Item.find({ category_ids: category._id, primary_user: category.primary_user }),
  },
  Item: {
    version: item => item.__v ?? 0,
    stock_totals: item => item.stock_entries == null ? null : stockTotals([item]),
  },
  StockEntry: {
    quantity: entry => quantityString(entry.quantity),
    location_id: entry => entry.location?._id || entry.location || null,
  },
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
    ...inventoryMutations,
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
      { user_id, table, recordId, addtlDelete = [] }, context
    ) => {
      const owner = await requireOwner(context);
      if (String(user_id) !== owner) throw AuthenticationError;
      const Model = await checkData({
        userId: user_id,
        userIdRequired: true,
        primaryUserRequired: true,
        table,
        recordId,
      });

      addtlDelete = [...addtlDelete, { columnId: "notes", table: "Note" }];
      const recordData = await Model.findOne({ _id: recordId, primary_user: owner });
      if (!recordData) throw new Error('Record not found in your inventory.');
      if (table === 'Location' || recordData.parent_category !== undefined ||
          recordData.category_ids !== undefined || recordData.stock_entries !== undefined) {
        throw new Error('Canonical inventory deletion requires an explicit operation.');
      }
      if (table === 'Category' && (await Category.exists({ parent_category: recordId }) ||
          await Item.exists({ category_ids: recordId }))) throw new Error('Category is still referenced.');
      await handleRelationalDelete({
        recordData,
        relationalDelete: addtlDelete,
      });

      await Model.findByIdAndDelete(recordId);

      return recordId;
    },

    createRecord: async (__, { user_id, table, data, addtlUpdates = [] }, context) => {
      const canonicalFields = ['parent_category', 'category_ids', 'stock_entries'];
      const isCanonicalField = field => canonicalFields.includes(String(field).split('.')[0]);
      if (Object.keys(data).some(isCanonicalField) ||
          addtlUpdates.some(update => isCanonicalField(update.field))) {
        throw new Error('Canonical inventory relationships are not writable through the legacy record API.');
      }
      const owner = await requireOwner(context);
      if (user_id && String(user_id) !== owner) throw AuthenticationError;
      if (!['Category', 'Item', 'Location', 'Note'].includes(table)) throw new Error('Use the explicit account operations.');
      // Legacy relational writes are limited to the existing UI's link operations.
      for (const update of addtlUpdates) {
        const { parentTable, parentId, field, action = 'push' } = update;
        if (!['push', 'pull'].includes(action) ||
            !((parentTable === 'User' && ['items', 'categories'].includes(field)) ||
              (parentTable === 'Category' && ['items', 'subcategory'].includes(field)))) {
          throw new Error('Unsupported legacy relationship update.');
        }
        const parent = parentTable === 'User' ? await User.findById(parentId) : await Category.findById(parentId);
        if (!parent || (parentTable === 'User' ? String(parent._id) : String(parent.primary_user)) !== owner ||
            parent.parent_category !== undefined) throw new Error('Invalid legacy relationship target.');
      }
      const Model = await checkData({ table });

      data = { ...data, primary_user: owner };

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

    updateRecord: async (__, args, context) => {
      await requireOwner(context);
      throw new Error('Generic updates are unavailable. Use an explicit inventory operation.');
    },
  },
};

module.exports = resolvers;
