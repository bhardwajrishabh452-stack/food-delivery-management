import crypto from "crypto";
import { calculateOrderFinancials } from "../services/commissionEngine.js";
import { dispatchOrderToRider } from "../services/dispatchEngine.js";
import {
  createOrder as saveOrder,
  findOrderByIdOrNumber,
  listOrders,
  listOrdersByCustomer,
  updateOrderById
} from "../repositories/orderRepository.js";
import { findRestaurantById, isRestaurantApproved } from "../repositories/restaurantRepository.js";
import { findMenuItemForRestaurant } from "../repositories/menuRepository.js";
import { findCouponByCode, incrementCouponUsage } from "../repositories/couponRepository.js";
import { findDeliveryByOrderId, updateDeliveryByOrderId } from "../repositories/deliveryRepository.js";
import { createId, runInMemoryTransaction } from "../repositories/unitOfWork.js";

const allowedTransitions = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: []
};

const canAccessOrder = (user, order) =>
  user.role === "admin" ||
  String(order.customerId) === String(user._id) ||
  (user.role === "restaurant" && String(user.restaurantId) === String(order.restaurantId)) ||
  (user.role === "rider" && String(order.riderId) === String(user._id));

const isValidCoordinate = (value, min, max) =>
  value !== null &&
  value !== "" &&
  Number.isFinite(Number(value)) &&
  Number(value) >= min &&
  Number(value) <= max;

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const createRequestError = (status, message) => Object.assign(new Error(message), { status });

// @desc    Place a new food order
// @route   POST /api/orders
export const createOrder = async (req, res) => {
  try {
    const { restaurantId, items, couponCode, deliveryAddress, paymentMethod = "UPI" } =
      isRecord(req.body) ? req.body : {};
    if (!restaurantId || !Array.isArray(items) || items.length === 0 || items.length > 50) {
      return res.status(400).json({ success: false, message: "Order must contain items and restaurant" });
    }

    const restaurant = findRestaurantById(restaurantId);
    if (!isRestaurantApproved(restaurant)) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }
    if (!restaurant.isOpen) {
      return res.status(400).json({ success: false, message: "This restaurant is currently closed" });
    }

    if (!["UPI", "CARD", "NETBANKING", "COD"].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: "Unsupported payment method" });
    }

    const normalizedItems = [];
    for (const requestedItem of items) {
      if (
        !requestedItem ||
        typeof requestedItem.menuItemId !== "string" ||
        !Number.isInteger(requestedItem.quantity) ||
        requestedItem.quantity < 1 ||
        requestedItem.quantity > 20
      ) {
        return res.status(400).json({ success: false, message: "Each item needs a valid menuItemId and quantity from 1 to 20" });
      }

      const menuItem = findMenuItemForRestaurant(requestedItem.menuItemId, restaurant._id);
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({ success: false, message: "An item is unavailable or does not belong to this restaurant" });
      }

      normalizedItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: requestedItem.quantity,
        isVeg: menuItem.isVeg
      });
    }

    if (
      !deliveryAddress ||
      typeof deliveryAddress.street !== "string" ||
      !deliveryAddress.street.trim() ||
      deliveryAddress.street.length > 300 ||
      typeof deliveryAddress.city !== "string" ||
      !deliveryAddress.city.trim() ||
      deliveryAddress.city.length > 100 ||
      !isValidCoordinate(deliveryAddress.lat, -90, 90) ||
      !isValidCoordinate(deliveryAddress.lng, -180, 180) ||
      (deliveryAddress.contactPhone !== undefined &&
        (typeof deliveryAddress.contactPhone !== "string" || deliveryAddress.contactPhone.length > 30))
    ) {
      return res.status(400).json({ success: false, message: "Provide a valid delivery address and coordinates" });
    }

    // Lookup coupon
    let coupon = null;
    if (couponCode) {
      coupon = typeof couponCode === "string" ? findCouponByCode(couponCode.trim()) : null;
      if (
        coupon &&
        (!coupon.isActive || (coupon.validUntil && new Date(coupon.validUntil) < new Date()))
      ) {
        coupon = null;
      }
      if (!coupon) {
        return res.status(400).json({ success: false, message: "Invalid or expired coupon code" });
      }
    }

    // Calculate financials
    const financials = calculateOrderFinancials({
      items: normalizedItems,
      coupon,
      restaurantCommissionRate: restaurant.commissionRate || 15,
      distanceKm: 3.5
    });
    if (financials.subtotal < (restaurant.minOrderAmount || 0)) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount for this restaurant is ₹${restaurant.minOrderAmount}`
      });
    }
    if (coupon && financials.discount === 0) {
      return res.status(400).json({ success: false, message: "Order does not meet the coupon requirements" });
    }

    const orderId = createId();
    const orderNumber = `FDS-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date().toISOString();

    const customer = req.user;
    const transactionId = paymentMethod === "COD"
      ? null
      : `TXN_${paymentMethod}_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    const newOrder = {
      _id: orderId,
      orderNumber,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address,
      riderId: null,
      riderName: null,
      riderPhone: null,
      items: normalizedItems,
      pricing: {
        subtotal: financials.subtotal,
        tax: financials.tax,
        deliveryFee: financials.deliveryFee,
        packagingFee: financials.packagingFee,
        discount: financials.discount,
        total: financials.total
      },
      splits: financials.splits,
      couponCode: coupon ? coupon.code : null,
      payment: {
        method: paymentMethod,
        status: paymentMethod === "COD" ? "PENDING" : "COMPLETED",
        transactionId
      },
      deliveryAddress: {
        ...deliveryAddress,
        contactPhone: deliveryAddress.contactPhone || customer.phone
      },
      status: "PLACED",
      currentLocation: restaurant.address
        ? { lat: restaurant.address.lat, lng: restaurant.address.lng }
        : { lat: 28.6328, lng: 77.2197 },
      estimatedDeliveryMinutes: restaurant.deliveryTimeMinutes || 30,
      timeline: [
        {
          status: "PLACED",
          timestamp: now,
          note: paymentMethod === "COD"
            ? "Order placed; cash will be collected on delivery"
            : `Order placed and payment completed via ${paymentMethod}`,
          actorId: String(customer._id),
          actorRole: customer.role
        }
      ],
      createdAt: now
    };

    await runInMemoryTransaction(["orders", "deliveries", "coupons"], () => {
      const dispatchResult = dispatchOrderToRider(newOrder);
      if (dispatchResult) {
        newOrder.riderId = dispatchResult.rider._id;
        newOrder.riderName = dispatchResult.rider.name;
        newOrder.riderPhone = dispatchResult.rider.phone;
      }

      saveOrder(newOrder);
      if (coupon) incrementCouponUsage(coupon.code);
    }, customer);

    // Emit live socket event if io is bound to app
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit("new_incoming_order", newOrder);
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: newOrder
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get customer's orders
// @route   GET /api/orders/my-orders
export const getMyOrders = (req, res) => {
  try {
    const orders = req.user.role === "admin"
      ? listOrders()
      : listOrdersByCustomer(req.user._id);

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get order details by ID
// @route   GET /api/orders/:id
export const getOrderById = (req, res) => {
  try {
    const { id } = req.params;
    const order = findOrderByIdOrNumber(id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (!canAccessOrder(req.user, order)) {
      return res.status(403).json({ success: false, message: "You cannot view this order" });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update order status in lifecycle
// @route   PATCH /api/orders/:id/status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = isRecord(req.body) ? req.body : {};

    const order = findOrderByIdOrNumber(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (
      !Object.prototype.hasOwnProperty.call(allowedTransitions, status) ||
      !allowedTransitions[order.status] ||
      !allowedTransitions[order.status].includes(status)
    ) {
      return res.status(400).json({ success: false, message: `Order cannot transition from ${order.status} to ${status}` });
    }

    const isRestaurantOwner =
      req.user.role === "restaurant" && String(req.user.restaurantId) === String(order.restaurantId);
    const isAssignedRider =
      req.user.role === "rider" && String(req.user._id) === String(order.riderId);
    const allowedForActor =
      req.user.role === "admin" ||
      (isRestaurantOwner && ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "CANCELLED"].includes(status)) ||
      (isAssignedRider && ["OUT_FOR_DELIVERY", "DELIVERED"].includes(status));

    if (!allowedForActor) {
      return res.status(403).json({ success: false, message: "You cannot change this order's status" });
    }

    const timestamp = new Date().toISOString();
    let updatedOrder;
    await runInMemoryTransaction(["orders", "deliveries"], () => {
      const currentOrder = findOrderByIdOrNumber(id);
      if (!currentOrder) throw createRequestError(404, "Order not found");
      if (
        !Object.prototype.hasOwnProperty.call(allowedTransitions, status) ||
        !allowedTransitions[currentOrder.status] ||
        !allowedTransitions[currentOrder.status].includes(status)
      ) {
        throw createRequestError(
          400,
          `Order cannot transition from ${currentOrder.status} to ${status}`
        );
      }

      const ownsRestaurant =
        req.user.role === "restaurant" && String(req.user.restaurantId) === String(currentOrder.restaurantId);
      const isAssignedRider =
        req.user.role === "rider" && String(req.user._id) === String(currentOrder.riderId);
      const mayUpdate =
        req.user.role === "admin" ||
        (ownsRestaurant && ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "CANCELLED"].includes(status)) ||
        (isAssignedRider && ["OUT_FOR_DELIVERY", "DELIVERED"].includes(status));
      if (!mayUpdate) throw createRequestError(403, "You cannot change this order's status");

      currentOrder.status = status;
      currentOrder.timeline.push({
        status,
        timestamp,
        note: typeof note === "string" && note.length <= 240 ? note : `Order status updated to ${status}`,
        actorId: String(req.user._id),
        actorRole: req.user.role
      });

      if ((status === "READY_FOR_PICKUP" || status === "CONFIRMED") && !currentOrder.riderId) {
        const dispatchResult = dispatchOrderToRider(currentOrder);
        if (dispatchResult) {
          currentOrder.riderId = dispatchResult.rider._id;
          currentOrder.riderName = dispatchResult.rider.name;
          currentOrder.riderPhone = dispatchResult.rider.phone;
        }
      }

      if (status === "DELIVERED") {
        currentOrder.estimatedDeliveryMinutes = 0;
        currentOrder.deliveredAt = timestamp;
        if (currentOrder.payment?.method === "COD" && currentOrder.payment.status === "PENDING") {
          currentOrder.payment.status = "COMPLETED";
          currentOrder.payment.transactionId =
            currentOrder.payment.transactionId || `COD_${currentOrder.orderNumber}_${Date.now()}`;
        }
        const delivery = findDeliveryByOrderId(currentOrder._id);
        if (delivery) {
          updateDeliveryByOrderId(currentOrder._id, { status: "DELIVERED", deliveredAt: timestamp });
        }
      }
      updatedOrder = updateOrderById(currentOrder._id, currentOrder);
    }, req.user);

    // Broadcast socket event
    const io = req.app.get("io");
    if (io) {
      io.to(`order_${updatedOrder._id}`).emit("order_status_changed", {
        orderId: updatedOrder._id,
        status,
        timeline: updatedOrder.timeline
      });
      io.to(`restaurant_${updatedOrder.restaurantId}`).emit("order_updated", {
        orderId: updatedOrder._id,
        status: updatedOrder.status
      });
    }

    res.json({
      success: true,
      message: `Order status changed to ${status}`,
      data: updatedOrder
    });
  } catch (error) {
    const statusCode = Number.isInteger(error.status) ? error.status : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

// @desc    Get all orders (admin view)
// @route   GET /api/orders
export const getAllOrders = (req, res) => {
  try {
    const { status, restaurantId } = req.query;
    let list = listOrders();

    if (status) {
      list = list.filter((o) => o.status === status);
    }
    if (restaurantId) {
      list = list.filter((o) => String(o.restaurantId) === String(restaurantId));
    }

    res.json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
