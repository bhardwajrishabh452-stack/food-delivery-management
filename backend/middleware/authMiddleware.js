import jwt from "jsonwebtoken";
import { findUserById } from "../repositories/userRepository.js";
import { findRestaurantById, isRestaurantApproved } from "../repositories/restaurantRepository.js";
import { logSecurityEvent } from "./securityEvents.js";

const getJwtSecret = () => {
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32)
  ) {
    throw new Error("JWT_SECRET must contain at least 32 bytes in production");
  }
  return process.env.JWT_SECRET || "fds_local_development_secret_change_me";
};

export const safeUser = (user) => {
  const { password, ...publicProfile } = user;
  if (user.role === "rider") publicProfile.isApproved = user.isApproved === true;
  if (user.role === "restaurant") {
    const restaurant = findRestaurantById(user.restaurantId);
    publicProfile.isApproved = user.isApproved === true && isRestaurantApproved(restaurant);
  }
  return publicProfile;
};

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      restaurantId: user.restaurantId || null
    },
    getJwtSecret(),
    { expiresIn: "24h" }
  );
};

export const verifyToken = (token) => jwt.verify(token, getJwtSecret());

export const protect = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "A valid Bearer token is required" });
  }

  let decoded;
  try {
    decoded = verifyToken(authorization.slice("Bearer ".length));
  } catch {
    logSecurityEvent("invalid_token", req);
    return res.status(401).json({ success: false, message: "Not authorized, invalid token" });
  }

  const user = findUserById(decoded.id);
  if (!user) {
    return res.status(401).json({ success: false, message: "User no longer exists" });
  }
  if (user.isActive === false) {
    return res.status(403).json({ success: false, message: "This account is currently disabled" });
  }
  req.user = user;
  try {
    res.setHeader("Authorization", `Bearer ${generateToken(user)}`);
  } catch (error) {
    return next(error);
  }
  return next();
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of [${roles.join(", ")}] roles. Current role: ${req.user?.role || "guest"}`
      });
    }
    if (req.user.role === "rider" && req.user.isApproved !== true) {
      return res.status(403).json({
        success: false,
        message: "Delivery rider account is awaiting platform approval"
      });
    }
    if (req.user.role === "restaurant") {
      const restaurant = findRestaurantById(req.user.restaurantId);
      if (!isRestaurantApproved(restaurant) || req.user.isApproved !== true) {
        return res.status(403).json({
          success: false,
          message: "Restaurant account is awaiting platform approval"
        });
      }
    }
    next();
  };
};
