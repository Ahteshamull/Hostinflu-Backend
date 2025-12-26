import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import dbConnect from "./config/database/dbConfig.js";
import router from "./api/index.js";

const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static("uploads"));

// Routes
app.use(router);

// Root route
app.get("/", (req, res) => {
  res.json({
    error: false,
    success: true,
    message: `Welcome to Hostinflu. Server is running on port ${PORT}`,
    version: "v1",
  });
});

// DB connect
dbConnect();

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at ${PORT}`);
});
