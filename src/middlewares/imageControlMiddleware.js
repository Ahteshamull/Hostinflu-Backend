import multer from "multer";
import path from "path";

// Define storage options for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads"); // Define the folder to store uploaded files
  },
  filename: function (req, file, cb) {
    const fileExt = path.extname(file.originalname);
    const fileName =
      file.originalname
        .replace(fileExt, "")
        .toLowerCase()
        .split(" ")
        .join("-") +
      "-" +
      Date.now(); // Generate a unique filename using the current timestamp
    cb(null, fileName + fileExt);
  },
});

// Define the multer upload configuration
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
});

// Middleware to handle errors
export function errorCheck(err, req, res, next) {
  if (err) {
    if (err instanceof multer.MulterError) {
      // Specific error for multer (e.g., file size exceeded)
      return res
        .status(400)
        .json({ error: true, message: `File upload error: ${err.message}` });
    }
    // General error handling
    return res
      .status(500)
      .json({ error: true, message: err.message || "Internal server error" });
  }
  next();
}
