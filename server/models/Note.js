const { Schema, model } = require("mongoose");
const BaseModel = require("./baseModel");

const schema = new Schema({})
schema.add(BaseModel)

schema.add({
  text: {
    type: String,
    required: true,
  },
});

const Note = model("Note", schema);
module.exports = Note;
