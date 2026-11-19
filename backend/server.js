import http from "http";
import https from "https";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { closeDB, connectDB, getPersistenceStatus } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import menusRoutes from "./routes/menusRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import trackingRoutes from "./routes/trackingRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import settlementRoutes from "./routes/settlementRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { verifyToken } from "./middleware/authMiddleware.js";
import { findUserById } from "./repositories/userRepository.js";
import { findOrderById } from "./repositories/orderRepository.js";
import { findRestaurantById, isRestaurantApproved } from "./repositories/restaurantRepository.js";
import { createRateLimiter } from "./middleware/rateLimit.js";
import { sanitizeRequest } from "./middleware/sanitizeInput.js";
import { logSecurityEvent } from "./middleware/securityEvents.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { ensurePlatformAdmin } from "./security/platformAdmin.js";

dotenv.config();
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".env") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";

const app = express();
const keyPath = process.env.HTTPS_KEY_PATH;
const certificatePath = process.env.HTTPS_CERT_PATH;
if (Boolean(keyPath) !== Boolean(certificatePath)) {
  throw new Error("HTTPS_KEY_PATH and HTTPS_CERT_PATH must be configured together");
}

const trustProxySetting = (process.env.TRUST_PROXY || "").trim();
if (trustProxySetting) {
  const trustedProxies = /^\d+$/.test(trustProxySetting)
    ? Number(trustProxySetting)
    : trustProxySetting.split(",").map((value) => value.trim()).filter(Boolean);
  if (Array.isArray(trustedProxies) && trustedProxies.length === 0) {
    throw new Error("TRUST_PROXY must name at least one trusted proxy address or hop count");
  }
  app.set(
    "trust proxy",
    trustedProxies
  );
}
if (isProduction && (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32)) {
  throw new Error("JWT_SECRET must contain at least 32 bytes in production");
}
if (isProduction && !keyPath && !trustProxySetting) {
  throw new Error("Production requires direct HTTPS certificates or a specifically trusted TLS-terminating proxy");
}

const server = keyPath
  ? https.createServer({
    key: fs.readFileSync(path.resolve(__dirname, keyPath)),
    cert: fs.readFileSync(path.resolve(__dirname, certificatePath)),
    minVersion: "TLSv1.3"
  }, app)
  : http.createServer(app);
const isSecureSocketRequest = (request) => {
  if (request.socket.encrypted) return true;
  const trustProxy = app.get("trust proxy fn");
  if (!trustProxy(request.socket.remoteAddress, 0)) return false;
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  return typeof forwardedProtocol === "string" &&
    forwardedProtocol.split(",")[0].trim().toLowerCase() === "https";
};
const frontendOrigin =
  process.env.FRONTEND_ORIGIN || (isProduction ? false : "http://localhost:3000");

const io = new Server(server, {
  cors: {
    origin: frontendOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    exposedHeaders: ["Authorization"]
  }
});

// Attach io instance to express app for access in controllers
app.set("io", io);

// Middlewares
app.use((req, res, next) => {
  if (isProduction && !req.secure && req.path !== "/api/health") {
    return res.status(426).json({ success: false, message: "HTTPS is required" });
  }
  next();
});
app.use(securityHeaders({ production: isProduction }));
app.use(cors({ origin: frontendOrigin, exposedHeaders: ["Authorization"] }));
app.use("/api", createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests. Please try again later."
}));
app.use(express.json({ limit: "100kb" }));
app.use(sanitizeRequest);
app.use((req, res, next) => {
  if (
    ["POST", "PUT", "PATCH"].includes(req.method) &&
    req.is("application/json") &&
    (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
  ) {
    return res.status(400).json({ success: false, message: "Request body must be a JSON object" });
  }
  next();
});

io.use((socket, next) => {
  if (isProduction && !isSecureSocketRequest(socket.request)) {
    logSecurityEvent("insecure_socket_request", socket.request);
    return next(new Error("HTTPS is required"));
  }

  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token) {
      return next(new Error("Authentication required"));
    }

    const decoded = verifyToken(token);
    const user = findUserById(decoded.id);
    if (!user) return next(new Error("Unauthorized"));
    if (user.role === "rider" && user.isApproved !== true) {
      return next(new Error("Delivery rider account is awaiting platform approval"));
    }
    if (user.role === "restaurant") {
      const restaurant = findRestaurantById(user.restaurantId);
      if (!isRestaurantApproved(restaurant) || user.isApproved !== true) {
        return next(new Error("Restaurant account is awaiting platform approval"));
      }
    }
    socket.data.user = user;
    socket.data.tokenExpiresAt = decoded.exp * 1000;
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
});

// Socket.io events are restricted to authenticated order and restaurant participants.
io.on("connection", (socket) => {
  const user = socket.data.user;
  const expiryDelay = Math.max(0, socket.data.tokenExpiresAt - Date.now());
  const expiryTimer = setTimeout(() => socket.disconnect(true), expiryDelay);
  console.log(`[Socket.io] Authenticated client connected: ${socket.id}`);

  socket.on("join_order_room", (orderId) => {
    if (typeof orderId !== "string") return;
    const order = findOrderById(orderId);
    const canJoin =
      user.role === "admin" ||
      String(order?.customerId) === String(user._id) ||
      (user.role === "restaurant" && String(user.restaurantId) === String(order?.restaurantId)) ||
      (user.role === "rider" && String(order?.riderId) === String(user._id));
    if (!canJoin) {
      socket.emit("access_denied", { message: "You cannot access this order's live events" });
      return;
    }
    socket.join(`order_${orderId}`);
  });

  socket.on("join_restaurant_room", (restaurantId) => {
    if (typeof restaurantId !== "string") return;
    const restaurant = findRestaurantById(restaurantId);
    if (!restaurant || (user.role !== "admin" && String(restaurant.ownerId) !== String(user._id))) {
      socket.emit("access_denied", { message: "You cannot access this restaurant's live events" });
      return;
    }
    socket.join(`restaurant_${restaurantId}`);
  });

  socket.on("disconnect", () => {
    clearTimeout(expiryTimer);
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/menus", menusRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (req, res) => {
  const persistence = getPersistenceStatus();
  res.json({
    status: "online",
    platform: "Food Delivery & Restaurant Management System (FDS)",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    persistence: {
      primary: persistence.primary,
      mongoConnected: persistence.mongoConnected
    }
  });
});

// Serve frontend build if dist directory exists
const distPath = path.resolve(__dirname, "../frontend/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = Number.isInteger(err.status) && err.status >= 400 && err.status < 500
    ? err.status
    : 500;
  if (statusCode === 500) console.error("[Server Error]", err.stack || err);
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500
      ? "Internal Server Error"
      : statusCode === 400
      ? "Invalid JSON request body"
      : statusCode === 413
      ? "Request body is too large"
      : err.message || "Internal Server Error"
  });
});

const PORT = process.env.PORT || 5000;

// Connect to Database & Start Server
connectDB().then(async () => {
  const administrator = await ensurePlatformAdmin();
  if (!administrator) {
    console.warn("[Auth] No platform administrator is configured. Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD to enable admin access.");
  }
  server.listen(PORT, () => {
    const protocol = keyPath ? "https" : "http";
    console.log(`🚀 [FDS Full-Stack Platform] running on ${protocol}://localhost:${PORT}`);
    console.log(`📡 [Real-time Events] WebSocket and Geo-tracking ready.`);
    console.log(`💻 [Frontend UI] Served directly from ${protocol}://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error("[Startup] Server was not started.", error);
  closeDB()
    .catch((closeError) => {
      console.error("[Database] Failed to close storage after startup failure.", closeError);
    })
    .finally(() => {
      process.exitCode = 1;
    });
});

export { app, server, io };
