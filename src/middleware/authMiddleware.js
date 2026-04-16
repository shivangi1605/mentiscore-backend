const jwt = require("jsonwebtoken");
const { db } = require("../config/firebase");

exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userDoc = await db.collection("users").doc(decoded.auth_id).get();
    
    if (!userDoc.exists) return res.status(401).json({ message: "User no longer exists" });
    
    req.user = { auth_id: decoded.auth_id, ...userDoc.data() };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

exports.requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};

exports.requireSameCollege = (req, res, next) => {
  const targetCollegeId = req.body.college_id || req.params.college_id || req.query.college_id;
  if (req.user.role === "admin") return next(); // System admin bypass
  
  if (req.user.college_id !== targetCollegeId) {
    return res.status(403).json({ message: "Forbidden: Cross-college access denied" });
  }
  next();
};