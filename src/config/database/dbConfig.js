import mongoose from "mongoose";

const dbConnect = async() => {
 
 await mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Database Connected...");
    })
    .catch((err) => {
      console.log(err);
    });
};

export default dbConnect;
