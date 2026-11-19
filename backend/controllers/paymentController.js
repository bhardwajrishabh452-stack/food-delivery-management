import crypto from "crypto";
import {
  findOrderById,
  findOrderByTransactionId,
  updateOrderById
} from "../repositories/orderRepository.js";
import { runInMemoryTransaction } from "../repositories/unitOfWork.js";

const canAccessOrder = (user, order) =>
  user.role === "admin" || String(order.customerId) === String(user._id);

const createRequestError = (status, message) => Object.assign(new Error(message), { status });

// @desc    Process simulated gateway payment (UPI / Card / NetBanking / COD)
// @route   POST /api/payments/process
export const processPayment = async (req, res) => {
  try {
    const { amount, method = "UPI", orderId } = req.body;

    if (
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      typeof orderId !== "string" ||
      !["UPI", "CARD", "NETBANKING", "COD"].includes(method)
    ) {
      return res.status(400).json({ success: false, message: "Provide a valid order, amount, and payment method" });
    }

    const order = findOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (!canAccessOrder(req.user, order)) {
      return res.status(403).json({ success: false, message: "You cannot pay for this order" });
    }
    if (Number(amount) !== Number(order.pricing.total) || method !== order.payment.method) {
      return res.status(400).json({ success: false, message: "Payment amount or method does not match the order" });
    }
    if (order.payment.status !== "PENDING" || order.payment.transactionId) {
      return res.status(409).json({ success: false, message: "This order already has a payment result" });
    }

    const transactionId = `TXN_${method}_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const timestamp = new Date().toISOString();
    let updatedOrder;
    await runInMemoryTransaction(["orders"], () => {
      const currentOrder = findOrderById(orderId);
      if (!currentOrder) throw createRequestError(404, "Order not found");
      if (!canAccessOrder(req.user, currentOrder)) {
        throw createRequestError(403, "You cannot pay for this order");
      }
      if (Number(amount) !== Number(currentOrder.pricing.total) || method !== currentOrder.payment.method) {
        throw createRequestError(400, "Payment amount or method does not match the order");
      }
      if (currentOrder.payment.status !== "PENDING" || currentOrder.payment.transactionId) {
        throw createRequestError(409, "This order already has a payment result");
      }

      currentOrder.payment.status = method === "COD" ? "PENDING" : "COMPLETED";
      currentOrder.payment.transactionId = transactionId;
      currentOrder.timeline.push({
        status: currentOrder.status,
        timestamp,
        note: method === "COD" ? "Cash on delivery selected" : `Payment completed via ${method}`,
        actorId: String(req.user._id),
        actorRole: req.user.role
      });
      updatedOrder = updateOrderById(currentOrder._id, currentOrder);
    }, req.user);

    const paymentResult = {
      transactionId,
      amount: Number(amount),
      method,
      status: updatedOrder.payment.status,
      gateway: method === "COD" ? "CashOnDeliveryService" : "FDSPayGateway",
      timestamp,
      orderId: updatedOrder._id,
      message:
        method === "COD"
          ? "Cash on delivery selected. Please pay the rider upon arrival."
          : `Payment of ₹${amount} completed successfully via ${method}.`
    };

    res.json({
      success: true,
      message: "Payment processed successfully",
      data: paymentResult
    });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Verify payment transaction
// @route   POST /api/payments/verify
export const verifyPayment = (req, res) => {
  try {
    const { transactionId } = req.body;
    if (typeof transactionId !== "string" || !transactionId.trim() || transactionId.length > 100) {
      return res.status(400).json({ success: false, message: "Transaction ID is required" });
    }

    const order = findOrderByTransactionId(transactionId);
    if (!order) {
      return res.status(404).json({ success: false, verified: false, message: "Payment transaction not found" });
    }
    if (!canAccessOrder(req.user, order)) {
      return res.status(403).json({ success: false, verified: false, message: "You cannot verify this payment" });
    }

    res.json({
      success: true,
      verified: order.payment.status === "COMPLETED",
      status: order.payment.status,
      transactionId,
      verifiedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
