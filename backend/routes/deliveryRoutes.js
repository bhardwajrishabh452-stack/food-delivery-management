import express from "express";
import {
  getAvailableDeliveries,
  getMyDeliveries,
  acceptDelivery,
  updateRiderLocation,
  getRiderEarnings,
  updateRiderAvailability
} from "../controllers/deliveryController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/available", protect, requireRole("rider"), getAvailableDeliveries);
router.get("/my-deliveries", protect, requireRole("rider"), getMyDeliveries);
router.patch("/availability", protect, requireRole("rider"), updateRiderAvailability);
router.post("/:orderId/accept", protect, requireRole("rider"), acceptDelivery);
router.post("/:orderId/location", protect, requireRole("rider"), updateRiderLocation);
router.get("/earnings", protect, requireRole("rider"), getRiderEarnings);

export default router;
