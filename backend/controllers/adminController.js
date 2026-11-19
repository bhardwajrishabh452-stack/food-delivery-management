import {
  findUserById,
  listUsers,
  updateUserById
} from "../repositories/userRepository.js";
import {
  findRestaurantById,
  findRestaurantByOwnerId,
  isRestaurantApproved,
  updateRestaurantById
} from "../repositories/restaurantRepository.js";
import { runInMemoryTransaction } from "../repositories/unitOfWork.js";

const getRestaurantForOwner = (user) =>
  findRestaurantByOwnerId(user._id) ||
  (user.restaurantId ? findRestaurantById(user.restaurantId) : null);

const toAdminAccount = (user) => {
  const account = {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || null,
    createdAt: user.createdAt || null,
    isActive: user.isActive !== false,
    isApproved: true
  };

  if (user.role === "restaurant") {
    const restaurant = getRestaurantForOwner(user);
    account.restaurantId = restaurant ? String(restaurant._id) : null;
    account.restaurantName = restaurant?.name || null;
    account.isApproved = Boolean(
      restaurant &&
      isRestaurantApproved(restaurant) &&
      user.isApproved === true
    );
  } else if (user.role === "rider") {
    account.vehicleDetails = user.vehicleDetails || null;
    account.isApproved = user.isApproved === true;
  }

  return account;
};

const sendControllerError = (res, error, context) => {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status === 500) console.error(`[Admin] ${context} failed`, error);
  return res.status(status).json({
    success: false,
    message: status === 500 ? "Unable to complete administrator request" : error.message
  });
};

export const getAdminAccounts = (req, res) => {
  try {
    const accounts = listUsers()
      .map(toAdminAccount)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return res.json({ success: true, count: accounts.length, data: accounts });
  } catch (error) {
    return sendControllerError(res, error, "Account listing");
  }
};

export const setAccountApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;
    if (typeof isApproved !== "boolean") {
      return res.status(400).json({ success: false, message: "isApproved must be a boolean" });
    }

    const account = findUserById(id);
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    if (!["restaurant", "rider"].includes(account.role)) {
      return res.status(400).json({
        success: false,
        message: "Only restaurant and delivery rider accounts require approval"
      });
    }

    const restaurant = account.role === "restaurant" ? getRestaurantForOwner(account) : null;
    if (account.role === "restaurant" && !restaurant) {
      return res.status(409).json({
        success: false,
        message: "Restaurant account has no linked restaurant profile"
      });
    }

    const updatedAccount = await runInMemoryTransaction(
      ["users", "restaurants"],
      () => {
        const updates = { isApproved };
        if (account.role === "rider" && !isApproved) updates.isAvailable = false;
        const updatedUser = updateUserById(account._id, updates);
        if (!updatedUser) {
          throw Object.assign(new Error("Account not found"), { status: 404 });
        }

        if (restaurant) {
          const restaurantUpdates = { ...restaurant, isApproved };
          if (!isApproved) restaurantUpdates.isOpen = false;
          updateRestaurantById(restaurant._id, restaurantUpdates);
        }
        return updatedUser;
      },
      req.user
    );

    return res.json({
      success: true,
      message: isApproved ? "Account approved" : "Account approval revoked",
      data: toAdminAccount(updatedAccount)
    });
  } catch (error) {
    return sendControllerError(res, error, "Account approval update");
  }
};

export const setAccountActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive must be a boolean" });
    }

    const account = findUserById(id);
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    if (!["customer", "restaurant", "rider"].includes(account.role)) {
      return res.status(400).json({ success: false, message: "The platform administrator cannot be disabled" });
    }

    const restaurant = account.role === "restaurant" ? getRestaurantForOwner(account) : null;
    const updatedAccount = await runInMemoryTransaction(
      ["users", "restaurants"],
      () => {
        const updates = { isActive };
        if (account.role === "rider" && !isActive) updates.isAvailable = false;
        const updatedUser = updateUserById(account._id, updates);
        if (!updatedUser) {
          throw Object.assign(new Error("Account not found"), { status: 404 });
        }
        if (restaurant && !isActive) {
          updateRestaurantById(restaurant._id, { ...restaurant, isOpen: false });
        }
        return updatedUser;
      },
      req.user
    );

    return res.json({
      success: true,
      message: isActive ? "Account enabled" : "Account disabled",
      data: toAdminAccount(updatedAccount)
    });
  } catch (error) {
    return sendControllerError(res, error, "Account status update");
  }
};
