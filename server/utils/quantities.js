// No Number/parseFloat arithmetic: stock quantities are decimal strings.
function normalizeQuantity(value) {
  if (typeof value !== 'string' || value.length > 128 || !/^\d+(?:\.\d+)?$/.test(value)) {
    throw new Error('Quantity must be a nonnegative plain decimal string.');
  }
  const [whole, rawFraction = ''] = value.split('.');
  const integer = whole.replace(/^0+(?=\d)/, '');
  const fraction = rawFraction.replace(/0+$/, '');
  const significant = (integer + fraction).replace(/^0+/, '');
  if (significant.length > 34 || fraction.length > 28 || integer.length > 34) {
    throw new Error('Quantity supports at most 34 significant digits and 28 decimal places.');
  }
  return fraction ? `${integer}.${fraction}` : integer;
}

function quantityString(value) {
  if (typeof value === 'string') return normalizeQuantity(value);
  if (!value || value._bsontype !== 'Decimal128') throw new Error('Expected a decimal string or Decimal128.');
  const text = value.toString();
  const match = /^(\d+)(?:\.(\d+))?E([+-]?\d+)$/i.exec(text);
  if (!match) return normalizeQuantity(text);
  const digits = match[1] + (match[2] || '');
  const point = match[1].length + Number(match[3]);
  // Bound expansion before allocating strings for unsupported stored values.
  if (point < -28 || point > 34) throw new Error('Stored quantity is outside supported precision.');
  const plain = point <= 0 ? `0.${'0'.repeat(-point)}${digits}`
    : point >= digits.length ? digits + '0'.repeat(point - digits.length)
      : `${digits.slice(0, point)}.${digits.slice(point)}`;
  return normalizeQuantity(plain);
}

function normalizeUnit(value) {
  if (value == null) return null;
  if (typeof value !== 'string') throw new Error('Unit must be text.');
  return value.trim() || null;
}

function formatTotal(coefficient, scale) {
  const digits = coefficient.toString().padStart(scale + 1, '0');
  if (!scale) return digits;
  const fraction = digits.slice(-scale).replace(/0+$/, '');
  return digits.slice(0, -scale) + (fraction ? `.${fraction}` : '');
}

function stockTotals(items) {
  const seen = new Set();
  const totals = new Map();
  for (const item of items) {
    if (!item._id) throw new Error('An item ID is required to avoid duplicate counting.');
    const id = item._id.toString();
    if (seen.has(id)) continue;
    seen.add(id);
    if (!Array.isArray(item.stock_entries)) throw new Error('Legacy item requires migration before stock aggregation.');
    for (const entry of item.stock_entries) {
      const unit = normalizeUnit(entry.unit);
      const [integer, fraction = ''] = quantityString(entry.quantity).split('.');
      const incoming = BigInt(integer + fraction);
      const current = totals.get(unit) || { coefficient: 0n, scale: 0 };
      const scale = Math.max(current.scale, fraction.length);
      totals.set(unit, {
        coefficient: current.coefficient * 10n ** BigInt(scale - current.scale)
          + incoming * 10n ** BigInt(scale - fraction.length),
        scale,
      });
    }
  }
  return [...totals].map(([unit, total]) => ({ unit, quantity: formatTotal(total.coefficient, total.scale) }));
}

module.exports = { normalizeQuantity, quantityString, normalizeUnit, stockTotals };
