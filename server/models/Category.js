const { Schema, model } = require("mongoose");
const { BaseModel } = require("./baseModel");

// Categories have subcategories that can further organize items, allowing unlimited nesting
// Categories can also have items assigned to them
const schema = new BaseModel({
  subcategory: [
    {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
  ],
  items: [
    {
      type: Schema.Types.ObjectId,
      ref: "Item",
    },
  ],
});

const Category = model("Category", schema);
module.exports = Category;
