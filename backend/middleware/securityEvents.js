export const logSecurityEvent = (event, req) => {
  const record = {
    type: "security_event",
    event,
    timestamp: new Date().toISOString(),
    ip: req.ip || req.socket?.remoteAddress || "unknown",
    method: req.method
  };
  console.warn(`[Security] ${JSON.stringify(record)}`);
};
