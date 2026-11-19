import {
  findRestaurantById,
  isRestaurantApproved,
  listRestaurants,
  updateRestaurantById
} from "../repositories/restaurantRepository.js";
import {
  listMenuItems,
  listMenuItemsByRestaurant,
  listVegetarianRestaurantIds
} from "../repositories/menuRepository.js";
import { listOrdersByRestaurant } from "../repositories/orderRepository.js";
import { runInMemoryTransaction } from "../repositories/unitOfWork.js";

const canAccessRestaurant = (user, restaurant) =>
  user.role === "admin" || String(restaurant.ownerId) === String(user._id);

const toPublicRestaurant = (restaurant) => {
  const { ownerId, bankDetails, ...publicDetails } = restaurant;
  return publicDetails;
};

// @desc    Get all restaurants with filtering & sorting
// @route   GET /api/restaurants
export const getAllRestaurants = (req, res) => {
  try {
    const { search, cuisine, sortBy, isVegOnly } = req.query;
    let list = listRestaurants().filter(isRestaurantApproved);

    // Filter by search term
    if (search) {
      const q = search.toLowerCase();
      const menuMatches = new Set(
        listMenuItems()
          .filter((item) => item.name.toLowerCase().includes(q))
          .map((item) => String(item.restaurantId))
      );
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisine.some((c) => c.toLowerCase().includes(q)) ||
          r.address?.city?.toLowerCase().includes(q) ||
          menuMatches.has(String(r._id))
      );
    }

    // Filter by cuisine
    if (cuisine && cuisine !== "All") {
      list = list.filter((r) =>
        r.cuisine.some((c) => c.toLowerCase() === cuisine.toLowerCase())
      );
    }

    // Filter by vegetarian items availability
    if (isVegOnly === "true") {
      const vegRestIds = new Set(
        listVegetarianRestaurantIds()
      );
      list = list.filter((r) => vegRestIds.has(String(r._id)));
    }

    // Sorting
    if (sortBy === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "deliveryTime") {
      list.sort((a, b) => a.deliveryTimeMinutes - b.deliveryTimeMinutes);
    } else if (sortBy === "costLowToHigh") {
      list.sort((a, b) => a.priceForTwo - b.priceForTwo);
    } else if (sortBy === "costHighToLow") {
      list.sort((a, b) => b.priceForTwo - a.priceForTwo);
    }

    res.json({
      success: true,
      count: list.length,
      data: list.map(toPublicRestaurant)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single restaurant profile + full menu
// @route   GET /api/restaurants/:id
export const getRestaurantById = (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = findRestaurantById(id);

    if (!isRestaurantApproved(restaurant)) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    const menu = listMenuItemsByRestaurant(id);

    // Group menu items by category
    const categories = [...new Set(menu.map((m) => m.category))];
    const categorizedMenu = categories.map((cat) => ({
      category: cat,
      items: menu.filter((m) => m.category === cat)
    }));

    res.json({
      success: true,
      data: {
        ...toPublicRestaurant(restaurant),
        menu,
        categorizedMenu
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update restaurant status (open/close, details)
// @route   PUT /api/restaurants/:id
export const updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = findRestaurantById(id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    if (!canAccessRestaurant(req.user, restaurant)) {
      return res.status(403).json({ success: false, message: "You cannot manage this restaurant" });
    }

    const allowedFields = ["name", "tagline", "isOpen", "deliveryTimeMinutes", "priceForTwo", "minOrderAmount"];
    if (req.user.role === "admin") allowedFields.push("commissionRate");
    if (Object.keys(req.body).some((key) => !allowedFields.includes(key))) {
      return res.status(400).json({ success: false, message: "Restaurant update contains unsupported fields" });
    }
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
    );
    const validText = (value, max) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
    if (
      Object.keys(updates).length === 0 ||
      (updates.name !== undefined && !validText(updates.name, 120)) ||
      (updates.tagline !== undefined && !validText(updates.tagline, 240)) ||
      (updates.isOpen !== undefined && typeof updates.isOpen !== "boolean") ||
      ["deliveryTimeMinutes", "priceForTwo", "minOrderAmount", "commissionRate"].some((key) =>
        updates[key] !== undefined &&
        (!Number.isFinite(Number(updates[key])) ||
          Number(updates[key]) < 0 ||
          (key === "commissionRate" && Number(updates[key]) > 100))
      )
    ) {
      return res.status(400).json({ success: false, message: "Restaurant update contains invalid fields or values" });
    }

    for (const key of ["deliveryTimeMinutes", "priceForTwo", "minOrderAmount", "commissionRate"]) {
      if (updates[key] !== undefined) updates[key] = Number(updates[key]);
    }
    if (updates.name !== undefined) updates.name = updates.name.trim();
    if (updates.tagline !== undefined) updates.tagline = updates.tagline.trim();
    const updatedRestaurant = await runInMemoryTransaction(["restaurants"], () =>
      updateRestaurantById(id, { ...restaurant, ...updates }),
      req.user
    );
    res.json({
      success: true,
      message: "Restaurant details updated",
      data: updatedRestaurant
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get incoming and historical orders for a restaurant
// @route   GET /api/restaurants/:id/orders
export const getRestaurantOrders = (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = findRestaurantById(id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }
    if (!canAccessRestaurant(req.user, restaurant)) {
      return res.status(403).json({ success: false, message: "You cannot view this restaurant's orders" });
    }
    const orders = listOrdersByRestaurant(id);
    // Sort latest first
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get restaurant financial overview and net earnings
// @route   GET /api/restaurants/:id/earnings
export const getRestaurantEarnings = (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = findRestaurantById(id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }
    if (!canAccessRestaurant(req.user, restaurant)) {
      return res.status(403).json({ success: false, message: "You cannot view this restaurant's earnings" });
    }

    const orders = listOrdersByRestaurant(id).filter(
      (o) =>
        String(o.restaurantId) === String(id) &&
        o.status !== "CANCELLED" &&
        (o.payment?.status === "COMPLETED" || o.payment?.method === "COD")
    );

    const totalOrders = orders.length;
    const totalFoodSales = orders.reduce((sum, o) => sum + (o.pricing?.subtotal || 0), 0);
    const commissionRate = restaurant.commissionRate || 15;
    const platformCommission = Math.round(
      orders.reduce(
        (sum, o) => sum + (o.splits?.platformCommission ?? (o.pricing?.subtotal || 0) * (commissionRate / 100)),
        0
      ) * 100
    ) / 100;
    const totalTax = orders.reduce((sum, o) => sum + (o.pricing?.tax || 0), 0);
    const netPayable = Math.round(
      orders.reduce(
        (sum, o) => sum + (o.splits?.restaurantNetPayable ?? (o.pricing?.subtotal || 0) + (o.pricing?.tax || 0) - (o.pricing?.subtotal || 0) * (commissionRate / 100)),
        0
      ) * 100
    ) / 100;

    res.json({
      success: true,
      data: {
        restaurantId: id,
        restaurantName: restaurant.name,
        commissionRate,
        totalOrders,
        totalFoodSales,
        platformCommission,
        totalTax,
        netPayable,
        settlementStatus: "PENDING_CYCLE"
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
