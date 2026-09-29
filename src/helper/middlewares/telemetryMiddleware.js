import { recordRequestLog } from "../helpers/serverTelemetry.js";

export const telemetryMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  // Capture client IP
  const clientIp =
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "127.0.0.1";

  // Capture user agent
  const userAgent = req.headers["user-agent"] || "Unknown";

  // Attach listener on response finish
  res.on("finish", () => {
    try {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;

      recordRequestLog({
        clientIp,
        method: req.method,
        endpoint: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
        userAgent,
      });
    } catch (err) {
      // Non-blocking error handling
      console.error("Error in telemetry middleware finish handler:", err.message);
    }
  });

  next();
};

export default telemetryMiddleware;
