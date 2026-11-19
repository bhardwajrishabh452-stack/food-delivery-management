/**
 * FDS Commission & Settlement Engine
 * Handles financial calculations, platform fee deductions, and vendor settlements
 */

export const calculateOrderFinancials = ({
  items,
  coupon = null,
  restaurantCommissionRate = 15,
  distanceKm = 3.5
}) => {
  // 1. Calculate raw subtotal
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // 2. Tax calculation (5% standard GST on food service)
  const tax = Math.round(subtotal * 0.05 * 100) / 100;

  // 3. Dynamic Delivery fee (base ₹30 + ₹10 per km after 2km)
  const baseDeliveryFee = 30;
  const extraDistance = Math.max(0, distanceKm - 2);
  const deliveryFee = Math.round(baseDeliveryFee + extraDistance * 10);

  // 4. Packaging fee
  const packagingFee = 20;

  // 5. Coupon discount calculation
  let discount = 0;
  if (coupon && coupon.isActive) {
    if (subtotal >= (coupon.minOrderAmount || 0)) {
      if (coupon.discountType === "percentage") {
        discount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount) {
          discount = Math.min(discount, coupon.maxDiscountAmount);
        }
      } else if (coupon.discountType === "flat") {
        discount = coupon.discountValue;
      }
    }
  }
  discount = Math.round(discount * 100) / 100;

  // 6. Customer Total
  const total = Math.max(0, Math.round((subtotal + tax + deliveryFee + packagingFee - discount) * 100) / 100);

  // 7. Commission Engine Splits
  // Platform Commission taken on raw food subtotal
  const platformCommission = Math.round((subtotal * (restaurantCommissionRate / 100)) * 100) / 100;

  // Restaurant Net Earning = Subtotal + Tax - Platform Commission
  const restaurantNetPayable = Math.round((subtotal + tax - platformCommission) * 100) / 100;

  // Rider Net Earning = 100% of delivery fee + tip (if any)
  const riderPayout = deliveryFee;

  // Platform Net Revenue = Commission + Packaging Fee - (any platform funded coupon discount)
  const platformNetProfit = Math.round((platformCommission + packagingFee) * 100) / 100;

  return {
    subtotal,
    tax,
    deliveryFee,
    packagingFee,
    discount,
    total,
    splits: {
      platformCommissionRate: restaurantCommissionRate,
      platformCommission,
      restaurantNetPayable,
      riderPayout,
      platformNetProfit
    }
  };
};

/**
 * Generate settlement statement for a vendor or rider
 */
export const generateSettlementLedger = (orders, entityType, entityId) => {
  const filtered = orders.filter((o) => {
    if (entityType === "restaurant") return String(o.restaurantId) === String(entityId);
    if (entityType === "rider") return String(o.riderId) === String(entityId);
    return false;
  });

  const totalOrders = filtered.length;
  const grossVolume = filtered.reduce((acc, o) => acc + (o.pricing?.total || 0), 0);
  const totalSubtotal = filtered.reduce((acc, o) => acc + (o.pricing?.subtotal || 0), 0);
  const totalCommission = Math.round(totalSubtotal * 0.15 * 100) / 100;
  const totalTax = filtered.reduce((acc, o) => acc + (o.pricing?.tax || 0), 0);

  let netPayout = 0;
  if (entityType === "restaurant") {
    netPayout = Math.round((totalSubtotal + totalTax - totalCommission) * 100) / 100;
  } else {
    // Rider earns the sum of delivery fees
    netPayout = filtered.reduce((acc, o) => acc + (o.pricing?.deliveryFee || 40), 0);
  }

  return {
    entityType,
    entityId,
    totalOrders,
    grossVolume,
    totalSubtotal,
    totalCommission,
    totalTax,
    netPayout,
    status: "PENDING"
  };
};
