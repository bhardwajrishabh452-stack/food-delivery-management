import { findRestaurantById, listRestaurants } from "../repositories/restaurantRepository.js";
import { listOrders } from "../repositories/orderRepository.js";
import { createSettlement as saveSettlement, listSettlements } from "../repositories/settlementRepository.js";
import { findUserById } from "../repositories/userRepository.js";
import { createId, runInMemoryTransaction } from "../repositories/unitOfWork.js";

const createRequestError = (status, message) => Object.assign(new Error(message), { status });

// @desc    Get complete settlements and commission engine overview (Admin)
// @route   GET /api/settlements/overview
export const getSettlementOverview = (req, res) => {
  try {
    const orders = listOrders().filter(
      (o) =>
        o.status !== "CANCELLED" &&
        o.payment?.status === "COMPLETED"
    );
    const settlementEligibleOrders = orders.filter((order) => order.status === "DELIVERED");
    const settledOrderIds = new Set(
      listSettlements().flatMap((settlement) => settlement.orderIds || []).map(String)
    );

    const totalGMV = orders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0);
    const totalFoodSubtotal = orders.reduce((sum, o) => sum + (o.pricing?.subtotal || 0), 0);
    const totalPlatformCommission = Math.round(
      orders.reduce((sum, o) => {
        const restaurant = findRestaurantById(o.restaurantId);
        return sum + (o.splits?.platformCommission ?? (o.pricing?.subtotal || 0) * ((restaurant?.commissionRate || 15) / 100));
      }, 0) * 100
    ) / 100;
    const totalTaxes = orders.reduce((sum, o) => sum + (o.pricing?.tax || 0), 0);
    const totalDeliveryFees = orders.reduce((sum, o) => sum + (o.pricing?.deliveryFee || 40), 0);
    const totalPackagingFees = orders.reduce((sum, o) => sum + (o.pricing?.packagingFee || 20), 0);

    // Restaurant breakdown
    const restaurantBreakdown = listRestaurants().map((rest) => {
      const restOrders = settlementEligibleOrders.filter(
        (o) => String(o.restaurantId) === String(rest._id) && !settledOrderIds.has(String(o._id))
      );
      const subtotal = restOrders.reduce((s, o) => s + (o.pricing?.subtotal || 0), 0);
      const commissionRate = rest.commissionRate || 15;
      const commission = Math.round(
        restOrders.reduce(
          (sum, o) => sum + (o.splits?.platformCommission ?? (o.pricing?.subtotal || 0) * (commissionRate / 100)),
          0
        ) * 100
      ) / 100;
      const tax = restOrders.reduce((s, o) => s + (o.pricing?.tax || 0), 0);
      const net = Math.round(
        restOrders.reduce(
          (sum, o) => sum + (o.splits?.restaurantNetPayable ?? (o.pricing?.subtotal || 0) + (o.pricing?.tax || 0) - (o.pricing?.subtotal || 0) * (commissionRate / 100)),
          0
        ) * 100
      ) / 100;

      return {
        restaurantId: rest._id,
        restaurantName: rest.name,
        ordersCount: restOrders.length,
        subtotal,
        commissionRate,
        commission,
        tax,
        netPayable: net,
        status: restOrders.length > 0 ? "PENDING_PAYOUT" : "NO_ACTIVITY",
        bankDetails: rest.bankDetails ? {
          bankName: rest.bankDetails.bankName || null,
          accountLast4: String(rest.bankDetails.accountNumber || "").slice(-4) || null,
          ifsc: rest.bankDetails.ifsc || null
        } : null
      };
    });
    const restaurantNetPayouts = Math.round(
      restaurantBreakdown.reduce((sum, restaurant) => sum + restaurant.netPayable, 0) * 100
    ) / 100;

    res.json({
      success: true,
      data: {
        summary: {
          totalGMV: Math.round(totalGMV * 100) / 100,
          totalFoodSubtotal: Math.round(totalFoodSubtotal * 100) / 100,
          totalPlatformCommission,
          restaurantNetPayouts,
          totalRiderPayouts: totalDeliveryFees,
          totalPackagingFees,
          settledPayouts: listSettlements().filter((s) => s.status === "SETTLED").reduce((s, x) => s + x.payoutAmount, 0),
          pendingPayouts: restaurantNetPayouts
        },
        restaurants: restaurantBreakdown,
        settlementsLedger: listSettlements()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Process a payout settlement to restaurant or rider
// @route   POST /api/settlements/process
export const processSettlement = async (req, res) => {
  try {
    const { entityType = "restaurant", entityId, amount, notes } = req.body;

    if (
      !entityId ||
      !["restaurant", "rider"].includes(entityType) ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      (notes !== undefined && (typeof notes !== "string" || notes.length > 240))
    ) {
      return res.status(400).json({ success: false, message: "Provide a valid entity, settlement type, and positive amount" });
    }

    const rider = entityType === "rider" ? findUserById(entityId) : null;
    const entity = entityType === "restaurant" ? findRestaurantById(entityId) : rider?.role === "rider" ? rider : null;
    if (!entity) {
      return res.status(404).json({ success: false, message: "Settlement recipient not found" });
    }

    let newSettlement;
    let due;
    await runInMemoryTransaction(["settlements"], () => {
      const currentRider = entityType === "rider" ? findUserById(entityId) : null;
      const currentEntity = entityType === "restaurant"
        ? findRestaurantById(entityId)
        : currentRider?.role === "rider" ? currentRider : null;
      if (!currentEntity) throw createRequestError(404, "Settlement recipient not found");

      const settledOrderIds = new Set(
        listSettlements().flatMap((settlement) => settlement.orderIds || []).map(String)
      );
      const orders = listOrders().filter((order) => {
        const matchesEntity = entityType === "restaurant"
          ? String(order.restaurantId) === String(entityId)
          : String(order.riderId) === String(entityId);
        return (
          matchesEntity &&
          order.status === "DELIVERED" &&
          order.payment?.status === "COMPLETED" &&
          !settledOrderIds.has(String(order._id))
        );
      });
      if (orders.length === 0) {
        throw createRequestError(409, "There are no unsettled orders for this recipient");
      }

      const subtotal = orders.reduce((sum, order) => sum + (order.pricing?.subtotal || 0), 0);
      const tax = orders.reduce((sum, order) => sum + (order.pricing?.tax || 0), 0);
      const commissionRate = entityType === "restaurant" ? currentEntity.commissionRate || 15 : 0;
      const commission = Math.round(
        orders.reduce(
          (sum, order) => sum + (order.splits?.platformCommission ?? (order.pricing?.subtotal || 0) * (commissionRate / 100)),
          0
        ) * 100
      ) / 100;
      due = entityType === "restaurant"
        ? Math.round(
            orders.reduce(
              (sum, order) => sum + (order.splits?.restaurantNetPayable ?? (order.pricing?.subtotal || 0) + (order.pricing?.tax || 0) - (order.pricing?.subtotal || 0) * (commissionRate / 100)),
              0
            ) * 100
          ) / 100
        : orders.reduce((sum, order) => sum + (order.splits?.riderPayout ?? order.pricing?.deliveryFee ?? 0), 0);
      if (Math.abs(Number(amount) - due) > 0.01) {
        throw createRequestError(400, `Settlement amount must match the outstanding balance of ₹${due}`);
      }

      const now = new Date();
      newSettlement = {
        _id: createId(),
        periodStart: new Date(now.getTime() - 14 * 86400000).toISOString().split("T")[0],
        periodEnd: now.toISOString().split("T")[0],
        entityType,
        entityId,
        entityName: currentEntity.name,
        orderIds: orders.map((order) => order._id),
        totalOrders: orders.length,
        grossAmount: subtotal,
        commissionAmount: commission,
        taxAmount: tax,
        payoutAmount: due,
        status: "SETTLED",
        payoutReference: `FDS_SIM_${now.getTime()}`,
        settledAt: now.toISOString(),
        notes: notes || "Settlement disbursed",
        processedBy: String(req.user._id)
      };
      saveSettlement(newSettlement);
    }, req.user);

    res.status(201).json({
      success: true,
      message: `Settlement record of ₹${due} created for ${newSettlement.entityName}; no bank transfer was initiated`,
      data: newSettlement
    });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};
