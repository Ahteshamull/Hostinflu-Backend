import mongoose from "mongoose";

const dbConnect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging indefinitely
    });
    console.log("📈 Database Connected...");
  } catch (err) {
    console.error("❌ Database Connection Error:", err.message);
    // Exit with failure code so container orchestrator knows connection failed
    process.exit(1);
  }
};

export default dbConnect;
