const { Schema, model } = require("mongoose");

const schema = new Schema({
  date_created: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  title: {
    type: String,
    required: true,
  },
  subcategory: [
    {
      type: Schema.Types.ObjectId,
      ref: "Subcategory",
    },
  ],
  notes: [
    {
      type: Schema.Types.ObjectId,
      ref: "Notes",
    },
  ],
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

const Category = model("Category", schema);
module.exports = Category;
