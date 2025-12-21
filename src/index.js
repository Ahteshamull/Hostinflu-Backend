import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import dbConnect from "./config/database/dbConfig.js";
import router from "./api/index.js";

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from uploads folder
app.use("/uploads", express.static("uploads"));

// Routes
app.use(router);

// Root route
app.get("/", (req, res) => {
    res.json({
        error: false,
        success: true,
    message: `Welcome to the Hostinflu , {Server Is Running} ${PORT}`,
    version: "v1",
  });
});

// DB connect
dbConnect();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running at ${PORT}`));
