import multer from "multer";
import path from "path";

// Define storage options for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads"); // Use existing uploads folder
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

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, JPG, PNG, GIF, WebP, and SVG files are allowed."
      ),
      false
    );
  }
};

// Define the multer upload configuration
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
    files: 10, // Limit to 10 files per upload
  },
  fileFilter: fileFilter,
});

// Middleware to handle errors
export function errorCheck(err, req, res, next) {
  if (err) {
    if (err instanceof multer.MulterError) {
      // Specific error for multer
      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          return res.status(400).json({
            error: true,
            message: "File size too large. Maximum size is 10MB.",
          });
        case "LIMIT_FILE_COUNT":
          return res.status(400).json({
            error: true,
            message: "Too many files uploaded. Maximum is 10 files.",
          });
        case "LIMIT_UNEXPECTED_FILE":
          return res.status(400).json({
            error: true,
            message: "Unexpected file field.",
          });
        default:
          return res.status(400).json({
            error: true,
            message: `File upload error: ${err.message}`,
          });
      }
    }

    // General error handling
    if (err.message.includes("Invalid file type")) {
      return res.status(400).json({
        error: true,
        message: err.message,
      });
    }

    return res.status(500).json({
      error: true,
      message: err.message || "Internal server error",
    });
  }
  next();
}
