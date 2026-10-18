const { Schema, model } = require("mongoose");
const BaseModel = require("./baseModel");
const stockEntry = require("./stockEntry");

// Items track quantities associated with them
// Related items can be linked to item records for quick links and references
const schema = new Schema({})
schema.add(BaseModel)

schema.add({
  category_ids: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    default: undefined,
  },
  // Undefined distinguishes legacy records from an explicitly empty stock list.
  // Legacy quantity/location stay readable until the reviewed migration lands.
  stock_entries: { type: [stockEntry], default: undefined },
  quantity: {
    type: Number,
    required: true,
    default: 0,
  },
  related_items: [
    {
      type: Schema.Types.ObjectId,
      ref: "Item",
    },
  ],
});

schema.pre('validate', async function () {
  if (this.category_ids === undefined) return;
  if (!this.primary_user) throw new Error('Item membership requires an owner.');
  const ids = this.category_ids.map(id => id.toString());
  if (new Set(ids).size !== ids.length) throw new Error('Item categories must be unique.');
  if (!ids.length) return;
  const owned = await this.model('Category').countDocuments({
    _id: { $in: ids }, primary_user: this.primary_user,
  });
  if (owned !== ids.length) throw new Error('Every category must exist and belong to the item owner.');
});

schema.pre('validate', async function () {
  if (this.stock_entries === undefined) return;
  if (!Array.isArray(this.stock_entries)) throw new Error('Stock entries must be an array.');
  if (!this.primary_user) throw new Error('Stock entries require an item owner.');
  const locations = [...new Set(this.stock_entries.filter(entry => entry.location).map(entry => entry.location.toString()))];
  if (!locations.length) return;
  const Location = this.model('Location');
  const owned = await Location.countDocuments({ _id: { $in: locations }, primary_user: this.primary_user });
  if (owned !== locations.length) throw new Error('Every stock location must exist and belong to the item owner.');
});

const Item = model("Item", schema);
module.exports = Item;
