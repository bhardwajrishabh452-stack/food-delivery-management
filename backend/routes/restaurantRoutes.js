import express from "express";
import {
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant,
  getRestaurantOrders,
  getRestaurantEarnings
} from "../controllers/restaurantController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { transactionalAction } from "../middleware/transactionalAction.js";

const router = express.Router();

router.post(
  "/",
  protect,
  requireRole("restaurant", "admin"),
  transactionalAction("Restaurants"),
  updateRestaurant
);
router.get("/", getAllRestaurants);
router.get("/:id", getRestaurantById);
router.put("/:id", protect, requireRole("restaurant", "admin"), updateRestaurant);
router.get("/:id/orders", protect, requireRole("restaurant", "admin"), getRestaurantOrders);
router.get("/:id/earnings", protect, requireRole("restaurant", "admin"), getRestaurantEarnings);

export default router;
