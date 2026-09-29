import dotenv from "dotenv";

dotenv.config();

import express from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import dbConnect from "./config/database/dbConfig.js";
import router from "./api/index.js";
import cors from "cors";
import { initializeSocket } from "./socket/connection/socket.Connection.js";
import { telemetryMiddleware } from "./helper/middlewares/telemetryMiddleware.js";
import { renderTelemetryDashboardHtml } from "./helper/helpers/telemetryDashboardHtml.js";
import { getSystemMetrics } from "./helper/helpers/serverTelemetry.js";

const app = express();

const server = createServer(app);

const PORT = process.env.PORT || 5000;

initializeSocket(server);

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

app.use("/api/v1/payment/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static("uploads"));

// Request telemetry logging middleware
app.use(telemetryMiddleware);

// Main dashboard and root route
app.get("/", async (req, res) => {
  // If client specifically requests JSON (API client / Postman / query flag)
  const acceptsHtml = req.headers.accept?.includes("text/html");
  const wantsJson =
    req.query.format === "json" ||
    (req.headers.accept?.includes("application/json") && !acceptsHtml);

  if (wantsJson) {
    const metrics = await getSystemMetrics();
    return res.json({
      error: false,
      success: true,
      message: `Welcome to Hostinflu. Server is running on port ${PORT}`,
      version: "v1",
      ...metrics,
    });
  }

  // Render the real-time live telemetry dashboard HTML
  res.setHeader("Content-Type", "text/html");
  return res.send(renderTelemetryDashboardHtml());
});

// Direct telemetry dashboard route
app.get("/telemetry", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  return res.send(renderTelemetryDashboardHtml());
});

// Direct system metrics endpoint
app.get("/get-system-metrics", async (req, res) => {
  try {
    const metrics = await getSystemMetrics();
    return res.json(metrics);
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
});

app.use(router);

dbConnect();

server.listen(PORT, () => {
  console.log(`🛜  Server running at ${PORT}`);
  console.log(`⚡ Socket.IO server started`);
});
