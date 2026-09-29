import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to standalone HTML view file
const htmlFilePath = path.join(__dirname, "../../views/telemetryDashboard.html");

let cachedHtml = null;

export const renderTelemetryDashboardHtml = () => {
  if (!cachedHtml || process.env.NODE_ENV !== "production") {
    try {
      cachedHtml = fs.readFileSync(htmlFilePath, "utf8");
    } catch (err) {
      console.error("Error reading telemetry dashboard HTML:", err.message);
      return `<h1>Hostinflu Server Telemetry</h1><p>Error loading dashboard view: ${err.message}</p>`;
    }
  }
  return cachedHtml;
};

export default renderTelemetryDashboardHtml;
