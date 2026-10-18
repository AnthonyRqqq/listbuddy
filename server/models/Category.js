const { Schema, model } = require("mongoose");
const BaseModel = require("./baseModel");

// Categories have subcategories that can further organize items, allowing unlimited nesting
// Categories can also have items assigned to them
const schema = new Schema({})
schema.add(BaseModel)

schema.add({
  // Undefined marks legacy hierarchy; null explicitly marks a canonical root.
  parent_category: { type: Schema.Types.ObjectId, ref: 'Category', default: undefined },
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

schema.pre('validate', async function () {
  if (this.parent_category === undefined) return;
  if (!this.primary_user) throw new Error('Category hierarchy requires an owner.');
  const seen = new Set([this._id.toString()]);
  let parentId = this.parent_category;
  while (parentId) {
    const key = parentId.toString();
    if (seen.has(key)) throw new Error('Category hierarchy cannot contain cycles.');
    seen.add(key);
    const parent = await this.model('Category').findById(parentId);
    if (!parent || String(parent.primary_user) !== String(this.primary_user)) {
      throw new Error('Every ancestor must exist and belong to the category owner.');
    }
    if (parent.parent_category === undefined) {
      throw new Error('Parent category requires hierarchy migration first.');
    }
    parentId = parent.parent_category;
  }
});

const Category = model("Category", schema);
module.exports = Category;
