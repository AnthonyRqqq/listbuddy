const { Schema } = require("mongoose");

// Base model schema to be imnported to all other models except user
// Every model will receive:
// - Created date, automatically generated
// - Title, required
// - Optional notes attached (this also means notes can have notes attached)
// - Optional primary user attached - allows saving lists to DB, otherwise lists are saved to the local machine
// - Optional shared users attached - to share list with other people
// - Optional location attached for greater organization
const BaseModel = new Schema({
  date_created: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  title: {
    type: String,
    required: true,
  },
  notes: [
    {
      type: Schema.Types.ObjectId,
      ref: "Notes",
    },
  ],
  primaryUser: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  shared_users: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  location: {
    type: Schema.Types.ObjectId,
    ref: "Location",
  },
});

module.exports = BaseModel;
