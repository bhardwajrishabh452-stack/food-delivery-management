import { logSecurityEvent } from "./securityEvents.js";

const unsafePropertyNames = new Set(["__proto__", "prototype", "constructor"]);

const containsUnsafeKeys = (value) => {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsUnsafeKeys);

  return Object.entries(value).some(([key, nestedValue]) =>
    key.startsWith("$") ||
    key.includes(".") ||
    unsafePropertyNames.has(key) ||
    containsUnsafeKeys(nestedValue)
  );
};

export const sanitizeRequest = (req, res, next) => {
  if (containsUnsafeKeys(req.body) || containsUnsafeKeys(req.query)) {
    logSecurityEvent("unsafe_request_property", req);
    return res.status(400).json({
      success: false,
      message: "Request contains an unsupported property"
    });
  }
  return next();
};
