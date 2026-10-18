// Location IDs are supplied by the isolated database fixture runner.
module.exports = function stockFixture(owner, locationA, locationB) {
  return {
    title: 'Decimal stock fixture', primary_user: owner,
    stock_entries: [
      { location: locationA, quantity: '0.1', unit: ' kg ' },
      { location: locationB, quantity: '0.2', unit: 'kg' },
      { location: locationB, quantity: '3.5', unit: 'boxes' },
      { quantity: '2.25' },
    ],
  };
};
