import jwt from "jsonwebtoken";
import Admin from "../../admin/schema/admin.modal.js";

const superAdminMiddleware = async (req, res, next) => {
  let { token } = req.cookies;

  if (token) {
    try {
      let decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET || process.env.PRV_TOKEN
      );
      let adminId = decoded.id || decoded.loginUserInfo?.id;

      if (!adminId) {
        return res.status(403).json({
          success: false,
          message: "Invalid token structure",
        });
      }

      // Get admin from database to check role
      const admin = await Admin.findById(adminId);

      if (!admin) {
        return res.status(403).json({
          success: false,
          message: "Admin not found",
        });
      }

      if (admin.role === "superAdmin") {
        req.admin = admin; // Add admin to request for use in controller
        next();
      } else {
        return res.status(403).json({
          success: false,
          message: "Only Super Admin can create admins",
        });
      }
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized, JWT token is wrong or expired",
      });
    }
  } else {
    return res.status(403).json({
      success: false,
      message: "Token Not Found",
    });
  }
};

export default superAdminMiddleware;
