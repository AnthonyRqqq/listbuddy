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
      const result = await Model.findById({ _id: recordId });
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

    createCategory: async (
      __,
      { title, primary_user, shared_users, location, items }
    ) => {
      let extraUsers = [];
      if (shared_users) {
        const emailList = shared_users.split(",");
        for (const email of emailList) {
          try {
            const userRecord = await User.findOne({ email });
            if (userRecord) extraUsers.push(userRecord._id);
          } catch (e) {
            continue;
          }
        }
      }

      try {
        const data = await Category.create({
          title,
          primary_user,
          shared_users: extraUsers.length ? extraUsers : null,
          location,
          items,
        });

        return data;
      } catch (e) {
        console.error("Error creating new category", e);
        throw new Error("Error creating new category");
      }
    },

    createItem: async (
      __,
      {
        title,
        primary_user,
        shared_users,
        location,
        quantity,
        related_items = [],
      }
    ) => {
      let extraUsers = [];
      if (shared_users) {
        const emailList = shared_users.split(",");
        for (const email of emailList) {
          try {
            const userRecord = await User.findOne({ email });
            if (userRecord) extraUsers.push(userRecord._id);
          } catch (e) {
            continue;
          }
        }
      }

      try {
        const data = await Item.create({
          title,
          primary_user,
          shared_users: extraUsers.length ? extraUsers : null,
          location,
          related_items,
        });

        if (location) {
          await Category.findOneAndUpdate(
            { _id: location },
            { $push: { items: data._id } }
          );
        }

        return data;
      } catch (e) {
        console.error("Error creating new category", e);
        throw new Error("Error creating new category");
      }
    },

    deleteRecord: async (__, { user_id, table, recordId }) => {
      const Model = await checkData({
        userId: user_id,
        userIdRequired: true,
        primaryUserRequired: true,
        table,
        recordId,
      });

      await Model.findByIdAndDelete(recordId);

      return recordId;
    },

    createRecord: async (__, { table, data, addtlUpdates = [] }) => {
      const Model = await checkData({ table });

      if (!Model) throw new Error("Invalid table name");

      let data;
      try {
        data = await Model.create({ data });
      } catch (e) {
        console.error(e);
        throw new Error(`Error creating new "${table}" record.`);
      }

      try {
        await handleRelationalUpdates({
          relationalUpdates: addtlUpdates,
          recordData: data,
        });
      } catch (e) {
        console.error(e);
      }

      return created;
    },

    updateRecord: async (__, { user_id, table, data }) => {
      console.log(data);

      const Model = modelMap[table];

      if (!Model) throw new Error("Invalid table name");
    },
  },
};

module.exports = resolvers;
