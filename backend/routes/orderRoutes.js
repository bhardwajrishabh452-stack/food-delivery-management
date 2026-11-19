import express from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrders
} from "../controllers/orderController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { transactionalAction } from "../middleware/transactionalAction.js";

const router = express.Router();

router.post(
  "/",
  protect,
  requireRole("customer"),
  transactionalAction("Orders", { allowStandardRequest: true }),
  createOrder
);
router.get("/my-orders", protect, getMyOrders);
router.get("/all", protect, requireRole("admin"), getAllOrders);
router.get("/:id", protect, getOrderById);
router.patch("/:id/status", protect, requireRole("restaurant", "rider", "admin"), updateOrderStatus);

export default router;
