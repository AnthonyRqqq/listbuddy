const mongoose = require("mongoose");
const { User, Category, Location, Item } = require("../models");
const fixtures = require("../fixtures/demo");

// Caller must supply a disposable, empty database. Never clear existing data.
async function seedDemo() {
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const { name } of collections) {
    if (await mongoose.connection.db.collection(name).findOne({})) {
      throw new Error("Demo database is not empty; seeding refused.");
    }
  }
  const user = await User.create(fixtures.user);
  const location = await Location.create({ ...fixtures.location, primary_user: user._id });
  const item = await Item.create({ ...fixtures.item, primary_user: user._id, location: location._id });
  const category = await Category.create({ ...fixtures.category, primary_user: user._id, items: [item._id] });
  await User.updateOne({ _id: user._id }, { $set: { items: [item._id], categories: [category._id] } });
  return { user, location, item, category };
}

// CLI never loads .env or uses MONGO_URI.
if (require.main === module) {
  mongoose.connect("mongodb://127.0.0.1:27017/listbuddy_demo", { serverSelectionTimeoutMS: 5000 })
    .then(seedDemo)
    .then(() => console.log("Seeded listbuddy_demo. Login: demo@example.com / local-demo-only"))
    .catch((error) => { console.error(error.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
}
module.exports = { seedDemo };
