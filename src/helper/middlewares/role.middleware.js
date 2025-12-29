import User from "../../auth/schema/auth.modal.js";

// Middleware to check if user is host or influencer
const requireHostOrInfluencerRole = async (req, res, next) => {
  try {
    if (!req.user || (!req.user.id && !req.user._id)) {
      return res.status(401).json({
        message: "Authentication required",
        error: "Access denied",
      });
    }

    // Get user from database to check role
    const user = await User.findById(req.user.id || req.user._id);

    if (!user) {
      return res.status(403).json({
        message: "User not found",
        error: "Access denied",
      });
    }

    // Check if user has host or influencer role
    if (user.role !== "host" && user.role !== "influencer") {
      return res.status(403).json({
        message: "Only hosts and influencers can create this",
        error: "Access denied",
      });
    }

    // Add user role to request for controller use
    req.user.role = user.role;
    next();
  } catch (error) {
    console.error("Error in role middleware:", error);
    return res.status(500).json({
      message: "Server error",
      error: "Internal server error",
    });
  }
};

export { requireHostOrInfluencerRole };
