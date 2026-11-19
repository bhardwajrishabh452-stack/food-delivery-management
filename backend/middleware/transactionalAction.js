const messages = {
  Restaurants: "Restaurants updated successfully in Food Delivery & Restaurant Management",
  Menus: "Menus updated successfully in Food Delivery & Restaurant Management",
  Cart: "Cart updated successfully in Food Delivery & Restaurant Management",
  Orders: "Orders updated successfully in Food Delivery & Restaurant Management"
};

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const transactionalAction = (moduleName, { allowStandardRequest = false } = {}) => {
  const successMessage = messages[moduleName];
  if (!successMessage) throw new Error(`Unknown transactional action module: ${moduleName}`);

  return (req, res, next) => {
    const body = req.body;
    const hasEnvelope = isRecord(body) &&
      (Object.prototype.hasOwnProperty.call(body, "action") ||
        Object.prototype.hasOwnProperty.call(body, "projectId"));

    if (!hasEnvelope && allowStandardRequest) return next();

    if (
      !isRecord(body) ||
      body.action !== "execute" ||
      body.projectId !== "food-delivery" ||
      !isRecord(body.data)
    ) {
      return res.status(400).json({
        success: false,
        error: `Validation failed for Food Delivery & Restaurant Management ${moduleName}`
      });
    }

    req.body = body.data;
    if (moduleName === "Restaurants") {
      const { restaurantId, restaurant_id, id, ...updates } = body.data;
      const targetId = restaurantId || restaurant_id || id || req.user.restaurantId;
      if (typeof targetId !== "string" || !targetId.trim()) {
        return res.status(400).json({
          success: false,
          error: `Validation failed for Food Delivery & Restaurant Management ${moduleName}`
        });
      }
      req.params.id = targetId.trim();
      req.body = updates;
    }

    const originalStatus = res.status.bind(res);
    const originalJson = res.json.bind(res);
    let responseStatus = 200;
    res.status = (status) => {
      responseStatus = status;
      return res;
    };
    res.json = (payload) => {
      if (payload?.success && responseStatus < 400) {
        originalStatus(200);
        return originalJson({
          success: true,
          message: successMessage,
          ...(payload.data === undefined ? {} : { data: payload.data })
        });
      }

      const status = responseStatus >= 400 ? responseStatus : 500;
      const error = status === 400
        ? `Validation failed for Food Delivery & Restaurant Management ${moduleName}`
        : status === 403
          ? payload?.message || "You are not allowed to perform this action"
          : status === 404
            ? payload?.message || "Resource not found"
            : "Request could not be completed";
      originalStatus(status);
      return originalJson({ success: false, error });
    };

    return next();
  };
};
