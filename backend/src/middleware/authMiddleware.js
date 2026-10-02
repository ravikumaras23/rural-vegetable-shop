const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = String(
      req.headers.authorization || ""
    ).trim();

    if (
      !authHeader
        .toLowerCase()
        .startsWith("bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required. Please provide a valid Bearer token."
      });
    }

    const token =
      authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication token is missing."
      });
    }

    const jwtSecret =
      process.env.JWT_SECRET ||
      process.env.JWT_SECRET_KEY ||
      process.env.JWT_PRIVATE_KEY;

    if (!jwtSecret) {
      console.error(
        "JWT secret is not configured in the backend environment."
      );

      return res.status(500).json({
        success: false,
        message:
          "Server authentication configuration is incomplete."
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        jwtSecret
      );
    } catch (error) {
      if (
        error.name ===
        "TokenExpiredError"
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Your session has expired. Please login again."
        });
      }

      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token. Please login again."
      });
    }

    const userId =
      decoded?.id ||
      decoded?._id ||
      decoded?.userId ||
      decoded?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication token does not contain a user ID."
      });
    }

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "User account was not found. Please login again."
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been deactivated."
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error(
      "Authentication middleware error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Authentication failed due to a server error."
    });
  }
};

module.exports = {
  protect
};