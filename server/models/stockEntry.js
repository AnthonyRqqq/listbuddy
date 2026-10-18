const { Schema, Types } = require('mongoose');
const { normalizeQuantity, quantityString, normalizeUnit } = require('../utils/quantities');

module.exports = new Schema({
  location: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
  quantity: {
    type: Schema.Types.Decimal128,
    required: true,
    set: value => Types.Decimal128.fromString(
      value instanceof Types.Decimal128 ? quantityString(value) : normalizeQuantity(value)
    ),
    validate: value => { quantityString(value); return true; },
  },
  unit: { type: String, default: null, set: normalizeUnit },
});
