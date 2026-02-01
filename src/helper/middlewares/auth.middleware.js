import jwt from "jsonwebtoken";
import Admin from "../../admin/schema/admin.modal.js";

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Access token required",
    });
  }

  jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET || process.env.PRV_TOKEN,
    (err, user) => {
      if (err) {
        return res.status(403).json({
          message: "Invalid or expired token",
        });
      }
      req.user = user;
      next();
    },
  );
};

// Middleware to check if user has specific role
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        message: `Access denied. Only ${role}s can access this resource.`,
      });
    }
    next();
  };
};

// Middleware to check if user has host role
const requireHostRole = requireRole("host");

// Middleware to check if user has admin role
const requireAdminRole = requireRole("admin");

// Middleware to check if user has user role
const requireUserRole = requireRole("user");

// Middleware to check if user has admin or superadmin role
const requireSuperAdminOrAdminRole = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(403).json({
        message: "Access denied. User not authenticated.",
      });
    }

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      // Try to find all admins to see what's in the collection
      const allAdmins = await Admin.find({});

      return res.status(403).json({
        message: "Access denied. Admin not found.",
      });
    }

    if (admin.role !== "admin" && admin.role !== "superAdmin") {
      return res.status(403).json({
        message:
          "Access denied. Only admins and superadmins can access this resource.",
      });
    }

    // Add admin role to req.user for future use
    req.user.role = admin.role;
    next();
  } catch (error) {
    // Log error for debugging (remove in production)

    return res.status(500).json({
      message: "Server error during authorization.",
    });
  }
};

export {
  authenticateToken,
  requireRole,
  requireHostRole,
  requireAdminRole,
  requireUserRole,
  requireSuperAdminOrAdminRole,
};
