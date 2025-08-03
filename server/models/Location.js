const { Schema, model } = require("mongoose");
const { BaseModel } = require("./baseModel");

// Locations attached to other records
// Related locations can be linked to location records for quick links and references
const schema = new BaseModel({
  related_locations: [
    {
      type: Schema.Types.ObjectId,
      ref: "Location",
    },
  ],
});

const Location = model("Location", schema);
module.exports = Location;
