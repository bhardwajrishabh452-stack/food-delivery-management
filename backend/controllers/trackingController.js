import {
  advanceDriverSimulation,
  generateRouteWaypoints
} from "../services/geoTrackingService.js";
import { findOrderByIdOrNumber } from "../repositories/orderRepository.js";

const canAccessOrder = (user, order) =>
  user.role === "admin" ||
  String(order.customerId) === String(user._id) ||
  (user.role === "restaurant" && String(user.restaurantId) === String(order.restaurantId)) ||
  (user.role === "rider" && String(order.riderId) === String(user._id));

// @desc    Get real-time live tracking data for an order
// @route   GET /api/tracking/:orderId
export const getTrackingData = (req, res) => {
  try {
    const { orderId } = req.params;
    const order = findOrderByIdOrNumber(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (!canAccessOrder(req.user, order)) {
      return res.status(403).json({ success: false, message: "You cannot access this order's tracking data" });
    }

    const origin = order.restaurantAddress || {
      street: "Connaught Place",
      lat: 28.6328,
      lng: 77.2197
    };

    const destination = order.deliveryAddress || {
      street: "Sector 18, New Delhi",
      lat: 28.6139,
      lng: 77.2090
    };

    // Calculate full route waypoints
    const waypoints = generateRouteWaypoints(origin, destination, 10);

    // Current position
    const currentLocation = order.currentLocation || {
      lat: (origin.lat + destination.lat) / 2,
      lng: (origin.lng + destination.lng) / 2
    };

    res.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        restaurant: {
          name: order.restaurantName,
          address: origin
        },
        customer: {
          name: order.customerName,
          phone: order.customerPhone,
          address: destination
        },
        rider: {
          name: order.riderName || null,
          phone: order.riderPhone || null,
          vehicle: "DL 01 AB 1234 (Honda Activa)",
          rating: 4.88
        },
        currentLocation,
        estimatedDeliveryMinutes: order.estimatedDeliveryMinutes || 15,
        timeline: order.timeline,
        waypoints,
        pricing: order.pricing,
        items: order.items
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Step driver position along route (Simulation button for evaluators/testers)
// @route   POST /api/tracking/:orderId/simulate-step
export const stepSimulation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = findOrderByIdOrNumber(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (!canAccessOrder(req.user, order)) {
      return res.status(403).json({ success: false, message: "You cannot simulate this delivery" });
    }
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ success: false, message: "GPS simulation is unavailable in production" });
    }
    if (order.status !== "OUT_FOR_DELIVERY") {
      return res.status(409).json({ success: false, message: "GPS simulation is only available for active deliveries" });
    }

    const io = req.app.get("io");

    const result = await advanceDriverSimulation(order._id, io, req.user);
    if (!result) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({
      success: true,
      message: "Driver simulation position stepped forward",
      data: result.trackingPayload
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
