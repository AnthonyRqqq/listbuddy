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

module.exports = { handleRelationalDelete, handleRelationalUpdates, checkData };
