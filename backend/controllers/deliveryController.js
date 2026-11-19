import {
  createDelivery,
  findDeliveryByOrderId,
  updateDeliveryByOrderId
} from "../repositories/deliveryRepository.js";
import {
  findOrderByIdOrNumber,
  listOrders,
  listOrdersByRider,
  updateOrderById
} from "../repositories/orderRepository.js";
import { createId, runInMemoryTransaction } from "../repositories/unitOfWork.js";
import { findUserById, updateUserById } from "../repositories/userRepository.js";
import { db } from "../models/store.js";
import { createFeatureTransaction } from "../models/FeatureTransaction.js";

const createRequestError = (status, message) => Object.assign(new Error(message), { status });

// @desc    Get orders available for riders to pick up
// @route   GET /api/delivery/available
export const getAvailableDeliveries = (req, res) => {
  try {
    const available = listOrders().filter(
      (o) =>
        o.status === "READY_FOR_PICKUP" &&
        (!o.riderId || String(o.riderId) === String(req.user._id))
    );

    res.json({
      success: true,
      count: available.length,
      data: available
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get rider's active and completed deliveries
// @route   GET /api/delivery/my-deliveries
export const getMyDeliveries = (req, res) => {
  try {
    const deliveries = listOrdersByRider(req.user._id);

    res.json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update rider availability for dispatch
// @route   PATCH /api/delivery/availability
export const updateRiderAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;
    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ success: false, message: "isAvailable must be a boolean" });
    }

    let updatedRider;
    await runInMemoryTransaction(["users", "deliveryTransactions"], () => {
      const rider = findUserById(req.user._id);
      if (!rider || rider.role !== "rider") {
        throw createRequestError(404, "Delivery partner not found");
      }

      updatedRider = updateUserById(rider._id, { isAvailable });
      db.deliveryTransactions.push(createFeatureTransaction(
        "deliveryTransactions",
        isAvailable ? "online" : "offline",
        {
          riderId: String(rider._id),
          actor: { id: String(req.user._id), role: req.user.role }
        }
      ));
    }, req.user);

    return res.json({
      success: true,
      message: isAvailable ? "You are online and can receive delivery requests" : "You are offline",
      data: { isAvailable: updatedRider.isAvailable }
    });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Rider accepts delivery
// @route   POST /api/delivery/:orderId/accept
export const acceptDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const rider = req.user;

    const order = findOrderByIdOrNumber(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (order.status !== "READY_FOR_PICKUP") {
      return res.status(409).json({ success: false, message: "Only orders ready for pickup can be accepted" });
    }
    if (order.riderId && String(order.riderId) !== String(rider._id)) {
      return res.status(409).json({ success: false, message: "This order is assigned to another delivery partner" });
    }
    const hasAnotherActiveDelivery = listOrders().some(
      (entry) =>
        String(entry._id) !== String(order._id) &&
        String(entry.riderId) === String(rider._id) &&
        ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY"].includes(entry.status)
    );
    if (hasAnotherActiveDelivery) {
      return res.status(409).json({ success: false, message: "Complete your active delivery before accepting another order" });
    }

    const timestamp = new Date().toISOString();
    let acceptedOrder;
    await runInMemoryTransaction(["orders", "deliveries"], () => {
      const currentRider = findUserById(rider._id);
      if (!currentRider || currentRider.role !== "rider") {
        throw createRequestError(404, "Delivery partner not found");
      }
      if (currentRider.isAvailable === false) {
        throw createRequestError(409, "Go online before accepting a delivery");
      }

      const currentOrder = findOrderByIdOrNumber(orderId);
      if (!currentOrder) throw createRequestError(404, "Order not found");
      if (currentOrder.status !== "READY_FOR_PICKUP") {
        throw createRequestError(409, "Only orders ready for pickup can be accepted");
      }
      if (currentOrder.riderId && String(currentOrder.riderId) !== String(rider._id)) {
        throw createRequestError(409, "This order is assigned to another delivery partner");
      }
      const alreadyBusy = listOrders().some(
        (entry) =>
          String(entry._id) !== String(currentOrder._id) &&
          String(entry.riderId) === String(rider._id) &&
          ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY"].includes(entry.status)
      );
      if (alreadyBusy) {
        throw createRequestError(409, "Complete your active delivery before accepting another order");
      }

      currentOrder.riderId = currentRider._id;
      currentOrder.riderName = currentRider.name;
      currentOrder.riderPhone = currentRider.phone;
      currentOrder.status = "OUT_FOR_DELIVERY";
      currentOrder.timeline.push({
        status: "OUT_FOR_DELIVERY",
        timestamp,
        note: `Delivery partner ${currentRider.name} picked up order from ${currentOrder.restaurantName}`,
        actorId: String(currentRider._id),
        actorRole: currentRider.role
      });
      acceptedOrder = updateOrderById(currentOrder._id, currentOrder);

      const delivery = findDeliveryByOrderId(currentOrder._id);
      if (delivery) {
        updateDeliveryByOrderId(currentOrder._id, { status: "IN_TRANSIT", acceptedAt: timestamp });
      } else {
        createDelivery({
          _id: createId(),
          orderId: currentOrder._id,
          riderId: currentRider._id,
          riderName: currentRider.name,
          status: "IN_TRANSIT",
          pickupLocation: currentOrder.restaurantAddress,
          dropLocation: currentOrder.deliveryAddress,
          assignedAt: timestamp,
          acceptedAt: timestamp,
          deliveryFeeEarning: currentOrder.pricing?.deliveryFee || 0
        });
      }
    }, rider);

    const io = req.app.get("io");
    if (io) {
      io.to(`order_${acceptedOrder._id}`).emit("order_status_changed", {
        orderId: acceptedOrder._id,
        status: acceptedOrder.status,
        rider: { name: rider.name, phone: rider.phone }
      });
      io.to(`restaurant_${acceptedOrder.restaurantId}`).emit("order_updated", {
        orderId: acceptedOrder._id,
        status: acceptedOrder.status
      });
    }

    res.json({
      success: true,
      message: "Delivery accepted and started",
      data: acceptedOrder
    });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Update rider GPS coordinates
// @route   POST /api/delivery/:orderId/location
export const updateRiderLocation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { lat, lng } = req.body;

    if (
      lat === null ||
      lat === "" ||
      lng === null ||
      lng === "" ||
      typeof lat === "boolean" ||
      typeof lng === "boolean" ||
      !Number.isFinite(Number(lat)) ||
      !Number.isFinite(Number(lng)) ||
      Number(lat) < -90 ||
      Number(lat) > 90 ||
      Number(lng) < -180 ||
      Number(lng) > 180
    ) {
      return res.status(400).json({ success: false, message: "Coordinates (lat, lng) are required" });
    }

    const order = findOrderByIdOrNumber(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (String(order.riderId) !== String(req.user._id) || order.status !== "OUT_FOR_DELIVERY") {
      return res.status(403).json({ success: false, message: "You cannot update this delivery's location" });
    }

    const currentLocation = { lat: Number(lat), lng: Number(lng) };
    await runInMemoryTransaction(["orders"], () => {
      order.currentLocation = currentLocation;
      updateOrderById(order._id, order);
    }, req.user);

    const io = req.app.get("io");
    if (io) {
      io.to(`order_${order._id}`).emit("driver_location_update", {
        orderId: order._id,
        currentLocation: order.currentLocation
      });
    }

    res.json({
      success: true,
      currentLocation: order.currentLocation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get rider performance and earnings
// @route   GET /api/delivery/earnings
export const getRiderEarnings = (req, res) => {
  try {
    const riderId = String(req.user._id);
    const deliveries = listOrdersByRider(riderId).filter((order) => order.status === "DELIVERED");
    const today = new Date().toISOString().slice(0, 10);
    const deliveredToday = deliveries.filter((order) => {
      const deliveredAt = order.deliveredAt || [...(order.timeline || [])]
        .reverse()
        .find((entry) => entry.status === "DELIVERED")?.timestamp;
      const date = deliveredAt ? new Date(deliveredAt) : null;
      return date && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === today;
    });
    const deliveryFeeEarnings = deliveries.reduce(
      (sum, order) => sum + (order.splits?.riderPayout ?? order.pricing?.deliveryFee ?? 0),
      0
    );
    const todayEarnings = deliveredToday.reduce(
      (sum, order) => sum + (order.splits?.riderPayout ?? order.pricing?.deliveryFee ?? 0),
      0
    );

    res.json({
      success: true,
      data: {
        tripsCompleted: deliveries.length,
        todayTripsCompleted: deliveredToday.length,
        deliveryFeeEarnings,
        tipsEarnings: 0,
        incentives: 0,
        totalEarnings: deliveryFeeEarnings,
        todayEarnings,
        averageRating: null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
