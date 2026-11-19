import { findOrderById, updateOrderById } from "../repositories/orderRepository.js";
import { findDeliveryByOrderId, updateDeliveryByOrderId } from "../repositories/deliveryRepository.js";
import { runInMemoryTransaction } from "../repositories/unitOfWork.js";

/**
 * Generate intermediate GPS route points between origin and destination
 */
export const generateRouteWaypoints = (origin, destination, steps = 10) => {
  const points = [];
  const startLat = origin.lat ?? 28.6328;
  const startLng = origin.lng ?? 77.2197;
  const endLat = destination.lat ?? 28.6139;
  const endLng = destination.lng ?? 77.2090;

  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    // Add realistic subtle road curve jitter
    const jitterLat = i > 0 && i < steps ? (Math.sin(fraction * Math.PI) * 0.002) : 0;
    const jitterLng = i > 0 && i < steps ? (Math.cos(fraction * Math.PI) * 0.002) : 0;

    const lat = startLat + (endLat - startLat) * fraction + jitterLat;
    const lng = startLng + (endLng - startLng) * fraction + jitterLng;

    points.push({
      lat: Math.round(lat * 100000) / 100000,
      lng: Math.round(lng * 100000) / 100000,
      step: i,
      totalSteps: steps
    });
  }

  return points;
};

/**
 * Advance driver position simulation for an order
 */
export const advanceDriverSimulation = async (orderId, io = null, actor = null) => {
  const order = findOrderById(orderId);
  if (!order) return null;

  const origin = order.restaurantAddress || { lat: 28.6328, lng: 77.2197 };
  const dest = order.deliveryAddress || { lat: 28.6139, lng: 77.2090 };
  const waypoints = generateRouteWaypoints(origin, dest, 10);

  const result = await runInMemoryTransaction(["orders", "deliveries"], () => {
    let currentStep = order.simulationStep === undefined ? 1 : order.simulationStep + 1;

    if (currentStep >= waypoints.length) {
      currentStep = waypoints.length - 1;
      const deliveredAt = new Date().toISOString();
      order.status = "DELIVERED";
      order.deliveredAt = deliveredAt;
      order.timeline.push({
        status: "DELIVERED",
        timestamp: deliveredAt,
        note: "Package handed over to customer. Enjoy your meal!",
        actorId: String(actor._id),
        actorRole: actor.role
      }, actor);
      order.estimatedDeliveryMinutes = 0;
      const delivery = findDeliveryByOrderId(order._id);
      if (delivery) {
        updateDeliveryByOrderId(order._id, { status: "DELIVERED", deliveredAt });
      }
    } else {
      order.simulationStep = currentStep;
      order.estimatedDeliveryMinutes = Math.max(1, (waypoints.length - currentStep) * 2);
    }

    order.currentLocation = {
      lat: waypoints[currentStep].lat,
      lng: waypoints[currentStep].lng
    };
    const trackingPayload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      currentLocation: order.currentLocation,
      estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
      step: currentStep,
      totalSteps: waypoints.length - 1,
      isDelivered: order.status === "DELIVERED"
    };
    updateOrderById(order._id, order);
    return { order, trackingPayload, waypoints };
  });

  if (io) {
    io.to(`order_${orderId}`).emit("driver_location_update", result.trackingPayload);
    io.to(`restaurant_${result.order.restaurantId}`).emit("order_updated", {
      orderId: result.order._id,
      status: result.order.status
    });
  }

  return result;
};
