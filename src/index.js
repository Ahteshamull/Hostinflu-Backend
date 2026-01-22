import dotenv from "dotenv";

dotenv.config();

import express from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import dbConnect from "./config/database/dbConfig.js";
import router from "./api/index.js";
import cors from "cors";
import { initializeSocket } from "./socket/connection/socket.Connection.js";

const app = express();

//socket server
const server = createServer(app);

const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
initializeSocket(server);

app.use(
  cors({
    origin: "*", // Adjust this to your frontend URL in production
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static("uploads"));


app.use(router);


app.get("/", (req, res) => {
  res.json({
    error: false,
    success: true,
    message: `Welcome to Hostinflu. Server is running on port ${PORT}`,
    version: "v1",
  });
});


dbConnect();

// Start server
server.listen(PORT, () => {
  console.log(`🛜  Server running at ${PORT}`);
  console.log(`⚡ Socket.IO server started`);
});
