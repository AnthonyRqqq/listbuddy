const mongoose = require("mongoose");
const { User, Category, Location, Item } = require("../models");
const fixtures = require("../fixtures/demo");

// Never load .env or use MONGO_URI. Never clear existing data.
async function seed() {
  await mongoose.connect("mongodb://127.0.0.1:27017/listbuddy_demo", { serverSelectionTimeoutMS: 5000 });
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
  user.items = [item._id];
  user.categories = [category._id];
  await user.save();
  console.log("Seeded listbuddy_demo. Login: demo@example.com / local-demo-only");
}

seed().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
