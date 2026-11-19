import { recordCartSnapshot } from "../repositories/cartRepository.js";
import { runInMemoryTransaction } from "../repositories/unitOfWork.js";

export const recordCartTransaction = async (req, res) => {
  try {
    const { restaurantId = null, items, couponCode = null } = req.body;
    if (
      !Array.isArray(items) ||
      items.length > 50 ||
      (restaurantId !== null && (typeof restaurantId !== "string" || restaurantId.length > 100)) ||
      (couponCode !== null && (typeof couponCode !== "string" || couponCode.length > 40)) ||
      (items.length > 0 && !restaurantId) ||
      items.some((item) =>
        !item ||
        typeof item.menuItemId !== "string" ||
        item.menuItemId.length > 100 ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 20
      )
    ) {
      return res.status(400).json({ success: false, message: "Cart snapshot contains invalid items or fields" });
    }

    const details = {
      restaurantId,
      items: items.map(({ menuItemId, quantity }) => ({ menuItemId, quantity })),
      itemCount: items.reduce((count, item) => count + item.quantity, 0),
      couponCode
    };
    const transaction = await runInMemoryTransaction(
      ["cartTransactions"],
      () => recordCartSnapshot(req.user._id, details),
      req.user
    );

    return res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
