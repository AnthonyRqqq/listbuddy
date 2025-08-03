const { model } = require("mongoose");
const { BaseModel } = require("./baseModel");

const schema = new BaseModel({
  text: {
    type: String,
    required: true,
  },
});

const Note = model("Note", schema);
module.exports = Note;
