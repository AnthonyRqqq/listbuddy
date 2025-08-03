const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");

// User model requiring email and password
// One user account per email
// Items and categories linked to user record
const schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    maxLength: 50,
    trim: true,
    match: [
      /^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/,
      "Must be a valid email address.",
    ],
  },
  password: {
    type: String,
    required: true,
    maxLength: 50,
    minLength: 5,
  },
  items: [
    {
      type: Schema.Types.ObjectId,
      ref: "Item",
    },
  ],
  categories: [
    {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
  ],
});

// For encrypting password
schema.pre("save", async function (next) {
  if (this.isNew || this.isModified("password")) {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  next();
});

// For checking password
schema.methods.isValidPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const User = model("User", schema);
module.exports = User;
