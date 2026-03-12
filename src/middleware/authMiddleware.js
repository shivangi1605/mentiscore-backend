const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  try {
    console.log("🔐 Verifying token...");

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("✅ Token valid:", decoded);

    req.user = decoded;

    next();

  } catch (error) {
    console.log("❌ Token error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

exports.allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access forbidden: insufficient permissions"
      });
    }
    next();
  };
};