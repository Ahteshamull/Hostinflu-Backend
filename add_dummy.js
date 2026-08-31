import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = "mongodb+srv://hostinflu:hostinflu@hostinflu.zwlbmkw.mongodb.net/hostinflu?appName=Hostinflu";

async function addDummyTransactions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    const Payment = mongoose.model("Payment", new mongoose.Schema({}, { strict: false }));

    const specificUserId = new mongoose.Types.ObjectId("694c3ec5930dbb731740c336"); // abbas12
    const dummyUser2 = new mongoose.Types.ObjectId();
    const dummyCollab = new mongoose.Types.ObjectId();

    const t1 = {
      amount: 800,
      description: "App promotion collab",
      currency: "USD",
      status: "completed",
      provider: "STRIPE",
      userId: specificUserId,
      title: dummyCollab,
      selectInfluencerOrHost: dummyUser2,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const t2 = {
      amount: 1250,
      description: "Brand deal with Nike",
      currency: "USD",
      status: "completed",
      provider: "STRIPE",
      userId: specificUserId,
      title: dummyCollab,
      selectInfluencerOrHost: dummyUser2,
      createdAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
      updatedAt: new Date()
    };
    
    const t3 = {
      amount: 400,
      description: "Review video",
      currency: "USD",
      status: "completed",
      provider: "STRIPE",
      userId: specificUserId,
      title: dummyCollab,
      selectInfluencerOrHost: dummyUser2,
      createdAt: new Date(Date.now() - 86400000 * 5), // 5 days ago
      updatedAt: new Date()
    };

    await Payment.insertMany([t1, t2, t3]);
    console.log("Successfully inserted 3 dummy transactions for user 694c3ec5930dbb731740c336");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.connection.close();
  }
}

addDummyTransactions();
