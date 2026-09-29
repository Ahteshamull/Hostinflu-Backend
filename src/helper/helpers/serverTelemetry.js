import os from "os";
import fs from "fs";

// Ring buffer for keeping last N API requests
const MAX_REQUEST_LOGS = 60;
const MAX_TREND_POINTS = 30;

const requestLogs = [];
const trendHistory = [];

// Helper to format uptime into human-readable format (e.g. 5d 14h 22m 10s)
export const formatUptime = (seconds) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
};

// Snapshot helper for CPU load calculation
let previousCpuSnapshot = null;

const getCpuSnapshot = () => {
  const cpus = os.cpus() || [];
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }

  return { idle, total };
};

previousCpuSnapshot = getCpuSnapshot();

export const calculateCpuLoad = () => {
  const currentSnapshot = getCpuSnapshot();

  if (!previousCpuSnapshot) {
    previousCpuSnapshot = currentSnapshot;
    return 0;
  }

  const idleDelta = currentSnapshot.idle - previousCpuSnapshot.idle;
  const totalDelta = currentSnapshot.total - previousCpuSnapshot.total;

  previousCpuSnapshot = currentSnapshot;

  if (totalDelta <= 0) return 0;

  const usagePercent = 100 - (100 * idleDelta) / totalDelta;
  return Math.max(0, Math.min(100, Math.round(usagePercent * 10) / 10));
};

// Measure Disk Space (ROM) using built-in fs.promises.statfs
export const getDiskSpace = async () => {
  try {
    const stats = await fs.promises.statfs(process.cwd());
    const totalBytes = stats.bsize * stats.blocks;
    const freeBytes = stats.bsize * stats.bfree;
    const usedBytes = totalBytes - freeBytes;

    const totalGB = (totalBytes / 1024 ** 3).toFixed(2);
    const usedGB = (usedBytes / 1024 ** 3).toFixed(2);
    const freeGB = (freeBytes / 1024 ** 3).toFixed(2);
    const usagePercent =
      totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

    return {
      totalGB: parseFloat(totalGB),
      usedGB: parseFloat(usedGB),
      freeGB: parseFloat(freeGB),
      usagePercent,
    };
  } catch (error) {
    console.error("Error reading disk stats:", error.message);
    return {
      totalGB: 0,
      usedGB: 0,
      freeGB: 0,
      usagePercent: 0,
    };
  }
};

// Record an incoming API request to the ring buffer
export const recordRequestLog = ({
  clientIp,
  method,
  endpoint,
  statusCode,
  durationMs,
  userAgent,
}) => {
  // Ignore static assets and telemetry polling endpoints to keep stream meaningful
  if (
    endpoint.startsWith("/uploads") ||
    endpoint.startsWith("/socket.io") ||
    endpoint.includes("get-system-metrics") ||
    endpoint.includes("favicon.ico")
  ) {
    return;
  }

  const now = new Date();
  const timeString = now.toTimeString().split(" ")[0]; // HH:MM:SS

  const logEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: timeString,
    isoTimestamp: now.toISOString(),
    clientIp: clientIp || "127.0.0.1",
    method: method.toUpperCase(),
    endpoint,
    statusCode,
    durationMs: Math.round(durationMs * 10) / 10,
    userAgent: userAgent || "Unknown",
  };

  requestLogs.unshift(logEntry);

  if (requestLogs.length > MAX_REQUEST_LOGS) {
    requestLogs.pop();
  }
};

// Main function to gather all real-time system metrics
export const getSystemMetrics = async () => {
  const cpus = os.cpus() || [];
  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();
  const usedMemBytes = totalMemBytes - freeMemBytes;

  const totalRamGB = parseFloat((totalMemBytes / 1024 ** 3).toFixed(2));
  const usedRamGB = parseFloat((usedMemBytes / 1024 ** 3).toFixed(2));
  const freeRamGB = parseFloat((freeMemBytes / 1024 ** 3).toFixed(2));
  const ramUsagePercent = Math.round((usedMemBytes / totalMemBytes) * 100);

  const memUsage = process.memoryUsage();
  const nodeRssMB = parseFloat((memUsage.rss / 1024 ** 2).toFixed(2));
  const heapUsedMB = parseFloat((memUsage.heapUsed / 1024 ** 2).toFixed(2));
  const heapTotalMB = parseFloat((memUsage.heapTotal / 1024 ** 2).toFixed(2));

  const cpuLoad = calculateCpuLoad();
  const disk = await getDiskSpace();

  // Push new trend data point
  const now = new Date();
  const timeLabel = now.toTimeString().split(" ")[0];

  trendHistory.push({
    time: timeLabel,
    cpu: cpuLoad,
    ram: ramUsagePercent,
  });

  if (trendHistory.length > MAX_TREND_POINTS) {
    trendHistory.shift();
  }

  // Format platform name nicely
  const rawPlatform = os.platform();
  const platformName =
    rawPlatform === "win32"
      ? "windows"
      : rawPlatform === "darwin"
        ? "macOS"
        : rawPlatform;

  const release = os.release();
  const cpuModel = cpus[0]?.model ? cpus[0].model.trim() : "Unknown CPU";

  return {
    success: true,
    server: {
      name: "Hostinflu Backend Server",
      status: "ONLINE",
      port: process.env.PORT || 5000,
      environment: process.env.NODE_ENV || "development",
      timestamp: now.toISOString(),
    },
    system: {
      platform: `${platformName} (${release})`,
      arch: os.arch(),
      nodeVersion: process.version,
      systemUptime: formatUptime(os.uptime()),
      systemUptimeSeconds: Math.floor(os.uptime()),
      processUptime: formatUptime(process.uptime()),
      processUptimeSeconds: Math.floor(process.uptime()),
      cpuCores: cpus.length,
      cpuModel,
    },
    resources: {
      cpu: {
        loadPercent: cpuLoad,
        cores: cpus.length,
      },
      ram: {
        usedGB: usedRamGB,
        totalGB: totalRamGB,
        freeGB: freeRamGB,
        usagePercent: ramUsagePercent,
      },
      disk: {
        usedGB: disk.usedGB,
        totalGB: disk.totalGB,
        freeGB: disk.freeGB,
        usagePercent: disk.usagePercent,
      },
      nodeMemory: {
        rssMB: nodeRssMB,
        heapUsedMB,
        heapTotalMB,
      },
    },
    trends: [...trendHistory],
    recentLogs: [...requestLogs],
  };
};
