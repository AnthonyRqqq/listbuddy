const { Schema, model } = require("mongoose");
const { BaseModel } = require("./baseModel");

// Items track quantities associated with them
// Related items can be linked to item records for quick links and references
const schema = new BaseModel({
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

const Item = model("Item", schema);
module.exports = Item;
