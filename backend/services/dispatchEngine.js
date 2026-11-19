import { createDelivery } from "../repositories/deliveryRepository.js";
import { createId } from "../repositories/unitOfWork.js";
import { listAvailableRiders } from "../repositories/userRepository.js";

/**
 * Haversine formula to calculate distance between two coordinates in Kilometers
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 3.5; // fallback default 3.5km

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
};

/**
 * Auto-assigns the nearest available delivery rider to an order
 */
export const dispatchOrderToRider = (order) => {
  const restLat = order.restaurantAddress?.lat || 28.6328;
  const restLng = order.restaurantAddress?.lng || 77.2197;

  // Find all active riders
  const availableRiders = listAvailableRiders();

  if (availableRiders.length === 0) {
    console.warn(`[Dispatch] No riders currently online for Order ${order.orderNumber}. Order queued.`);
    return null;
  }

  // Calculate distance for each rider to restaurant and sort ascending
  const rankedRiders = availableRiders.map((rider) => {
    const riderLat = rider.currentLocation?.lat || restLat + 0.01;
    const riderLng = rider.currentLocation?.lng || restLng + 0.01;
    const distance = calculateDistanceKm(riderLat, riderLng, restLat, restLng);
    return { rider, distance };
  });

  rankedRiders.sort((a, b) => a.distance - b.distance);
  const selected = rankedRiders[0].rider;

  // Assign to order
  order.riderId = selected._id;
  order.riderName = selected.name;
  order.riderPhone = selected.phone;

  // Add delivery assignment record
  const assignment = createDelivery({
    _id: createId(),
    orderId: order._id,
    riderId: selected._id,
    riderName: selected.name,
    status: "OFFERED",
    pickupLocation: order.restaurantAddress,
    dropLocation: order.deliveryAddress,
    assignedAt: new Date().toISOString(),
    deliveryFeeEarning: order.pricing?.deliveryFee || 40
  });

  console.log(`[Dispatch] Auto-dispatched Order ${order.orderNumber} to Rider ${selected.name} (${rankedRiders[0].distance}km away).`);
  return { rider: selected, assignment };
};
