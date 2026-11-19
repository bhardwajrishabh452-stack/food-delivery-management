import { logSecurityEvent } from "./securityEvents.js";

export const createRateLimiter = ({ windowMs, max, message }) => {
  if (!Number.isInteger(windowMs) || windowMs < 1 || !Number.isInteger(max) || max < 1) {
    throw new Error("Rate limiter requires positive integer windowMs and max values");
  }

  const requestsByClient = new Map();
  let nextCleanupAt = 0;

  return (req, res, next) => {
    const now = Date.now();
    if (now >= nextCleanupAt) {
      for (const [clientId, window] of requestsByClient) {
        if (window.resetAt <= now) requestsByClient.delete(clientId);
      }
      nextCleanupAt = now + Math.min(windowMs, 60000);
    }

    const clientId = req.ip || req.socket?.remoteAddress || "unknown";
    let clientWindow = requestsByClient.get(clientId);
    if (!clientWindow || clientWindow.resetAt <= now) {
      clientWindow = { count: 0, resetAt: now + windowMs };
      requestsByClient.set(clientId, clientWindow);
    }
    clientWindow.count += 1;

    const remaining = Math.max(0, max - clientWindow.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((clientWindow.resetAt - now) / 1000));
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(retryAfterSeconds));

    if (clientWindow.count > max) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
      if (!clientWindow.blockedLogged) {
        clientWindow.blockedLogged = true;
        logSecurityEvent("rate_limit_blocked", req);
      }
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
};
