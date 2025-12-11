const { signToken, AuthenticationError } = require("../utils/auth");
const bcrypt = require("bcrypt");
const { Category, Item, Location, Note, User } = require("../models");

const modelMap = { User, Category, Item, Note, Location };

const checkData = async ({
  userId,
  userIdRequired,
  primaryUserRequired,
  table,
  recordId,
}) => {
  const Model = modelMap[table];
  if (!Model) throw new Error("Invalid table name.");

  if (!userId && userIdRequired)
    throw new Error("User ID is required to run this action.");

  if (primaryUserRequired) {
    try {
      const result = await Model.findOne({ primary_user: userId });
      if (!result)
        throw new Error("You do not have permission to run this action.");
    } catch (e) {
      console.error(e);
      throw new Error("Error checking user privileges");
    }
  }

  if (recordId) {
    try {
      const result = await Model.findById(recordId);
      if (!result)
        throw new Error("Could not find the target record for this action.");
    } catch (e) {
      console.error(e);
      throw new Error("Error checking the target record for this action");
    }
  }

  return Model;
};

const handleRelationalUpdates = async ({
  relationalUpdates = [],
  recordData,
}) => {
  if (!recordData) return;

  for (const update of relationalUpdates) {
    const { parentTable, parentId, field, action = "push" } = update;
    if (!parentTable || !parentId || !field) continue;

    const ParentModel = modelMap[parentTable];
    if (!ParentModel) continue;

    const updateObj = {};
    switch (action) {
      case "push":
        updateObj.$push = { [field]: recordData._id };
        break;
      case "pull":
        updateObj.$pull = { [field]: recordData._id };
        break;
      case "set":
        updateObj.$set = { [field]: update.value };
    }

    await ParentModel.findByIdAndUpdate(parentId, updateObj);
  }
};

const handleRelationalDelete = async ({
  relationalDelete = [],
  recordData,
}) => {
  if (!recordData) return;

  for (const update of relationalDelete) {
    const { parentTable, parentColumn } = update;
    if (!parentTable || !parentColumn) continue;

    const ParentModel = modelMap[parentTable];
    if (!ParentModel) continue;

    const ids = [recordData[update.columnId]].flat();
    for (const _id of ids) await ParentModel.findByIdAndDelete(_id);
  }
};

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
