import { db } from "../models/store.js";
import { clone } from "./clone.js";

export const listCoupons = () => clone(db.coupons);

export const findCouponByCode = (code) =>
  clone(db.coupons.find((coupon) => coupon.code.toUpperCase() === code.toUpperCase()) || null);

export const createCoupon = (coupon) => {
  db.coupons.push(clone(coupon));
  return clone(coupon);
};

export const incrementCouponUsage = (code) => {
  const coupon = db.coupons.find((entry) => entry.code === code);
  if (!coupon) return null;
  coupon.usageCount = (coupon.usageCount || 0) + 1;
  return clone(coupon);
};
