import {
  createMenuItem,
  deleteMenuItemById,
  findMenuItemById,
  listMenuItemsByRestaurant,
  updateMenuItemById
} from "../repositories/menuRepository.js";
import { createId, runInMemoryTransaction } from "../repositories/unitOfWork.js";
import { findRestaurantById, isRestaurantApproved } from "../repositories/restaurantRepository.js";

const canManageRestaurant = (user, restaurantId) =>
  user.role === "admin" || String(user.restaurantId) === String(restaurantId);

const isValidText = (value, maxLength) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;

// @desc    Get menu items for a restaurant
// @route   GET /api/menu/:restaurantId
export const getMenuByRestaurant = (req, res) => {
  try {
    const { restaurantId } = req.params;
    const restaurant = findRestaurantById(restaurantId);
    if (!isRestaurantApproved(restaurant)) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }
    const items = listMenuItemsByRestaurant(restaurantId);
    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add new dish/menu item
// @route   POST /api/menu
export const addMenuItem = async (req, res) => {
  try {
    const { restaurantId, name, category, description, price, isVeg = true, image, badge } = req.body;
    const restaurant = findRestaurantById(restaurantId);

    if (!restaurant || !canManageRestaurant(req.user, restaurantId)) {
      return res.status(403).json({ success: false, message: "You cannot manage this restaurant's menu" });
    }

    if (
      !isValidText(name, 100) ||
      !isValidText(category, 60) ||
      !Number.isFinite(Number(price)) ||
      Number(price) <= 0 ||
      Number(price) > 100000 ||
      typeof isVeg !== "boolean" ||
      (description !== undefined && (typeof description !== "string" || description.length > 1000)) ||
      (image !== undefined && (typeof image !== "string" || image.length > 2048)) ||
      (badge !== undefined && (typeof badge !== "string" || badge.length > 40))
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid name, category, positive price, and valid optional menu fields"
      });
    }

    const newItem = {
      _id: createId(),
      restaurantId,
      name: name.trim(),
      category: category.trim(),
      description: description?.trim() || "Freshly cooked to perfection.",
      price: Number(price),
      isVeg,
      isAvailable: true,
      rating: 4.5,
      badge: badge || "New",
      image:
        image ||
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80"
    };

    await runInMemoryTransaction(["menuItems"], () => createMenuItem(newItem), req.user);

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: newItem
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update menu item
// @route   PUT /api/menu/:id
export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = findMenuItemById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }

    if (!canManageRestaurant(req.user, item.restaurantId)) {
      return res.status(403).json({ success: false, message: "You cannot manage this menu item" });
    }

    const allowedFields = ["name", "category", "description", "price", "isVeg", "image", "badge", "isAvailable"];
    if (Object.keys(req.body).some((key) => !allowedFields.includes(key))) {
      return res.status(400).json({ success: false, message: "Menu update contains unsupported fields" });
    }
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
    );
    if (
      Object.keys(updates).length === 0 ||
      (updates.name !== undefined && !isValidText(updates.name, 100)) ||
      (updates.category !== undefined && !isValidText(updates.category, 60)) ||
      (updates.description !== undefined && (typeof updates.description !== "string" || updates.description.length > 1000)) ||
      (updates.price !== undefined && (!Number.isFinite(Number(updates.price)) || Number(updates.price) <= 0 || Number(updates.price) > 100000)) ||
      (updates.isVeg !== undefined && typeof updates.isVeg !== "boolean") ||
      (updates.isAvailable !== undefined && typeof updates.isAvailable !== "boolean") ||
      (updates.image !== undefined && (typeof updates.image !== "string" || updates.image.length > 2048)) ||
      (updates.badge !== undefined && (typeof updates.badge !== "string" || updates.badge.length > 40))
    ) {
      return res.status(400).json({ success: false, message: "Menu update contains invalid fields or values" });
    }

    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.name !== undefined) updates.name = updates.name.trim();
    if (updates.category !== undefined) updates.category = updates.category.trim();
    const updatedItem = await runInMemoryTransaction(
      ["menuItems"],
      () => updateMenuItemById(id, { ...item, ...updates }),
      req.user
    );

    res.json({
      success: true,
      message: "Menu item updated",
      data: updatedItem
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle menu item availability switch
// @route   PATCH /api/menu/:id/toggle-availability
export const toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const item = findMenuItemById(id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }
    if (!canManageRestaurant(req.user, item.restaurantId)) {
      return res.status(403).json({ success: false, message: "You cannot manage this menu item" });
    }

    item.isAvailable = !item.isAvailable;
    await runInMemoryTransaction(["menuItems"], () => updateMenuItemById(id, item), req.user);

    res.json({
      success: true,
      message: `Item marked as ${item.isAvailable ? "Available" : "Sold Out"}`,
      data: item
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a menu item
// @route   DELETE /api/menu/:id
export const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = findMenuItemById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }
    if (!canManageRestaurant(req.user, item.restaurantId)) {
      return res.status(403).json({ success: false, message: "You cannot manage this menu item" });
    }

    const deleted = await runInMemoryTransaction(["menuItems"], () => deleteMenuItemById(id), req.user);

    res.json({
      success: true,
      message: "Menu item removed successfully",
      data: deleted
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
