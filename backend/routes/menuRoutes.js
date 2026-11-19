import express from "express";
import {
  getMenuByRestaurant,
  addMenuItem,
  updateMenuItem,
  toggleAvailability,
  deleteMenuItem
} from "../controllers/menuController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:restaurantId", getMenuByRestaurant);
router.post("/", protect, requireRole("restaurant", "admin"), addMenuItem);
router.put("/:id", protect, requireRole("restaurant", "admin"), updateMenuItem);
router.patch("/:id/toggle-availability", protect, requireRole("restaurant", "admin"), toggleAvailability);
router.delete("/:id", protect, requireRole("restaurant", "admin"), deleteMenuItem);

export default router;
