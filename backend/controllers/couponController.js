import { createCoupon as saveCoupon, findCouponByCode, listCoupons } from "../repositories/couponRepository.js";
import { createId, runInMemoryTransaction } from "../repositories/unitOfWork.js";

// @desc    List all active coupons
// @route   GET /api/coupons
export const getActiveCoupons = (req, res) => {
  try {
    const coupons = listCoupons().filter((coupon) => coupon.isActive);
    res.json({
      success: true,
      count: coupons.length,
      data: coupons
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Validate coupon with order subtotal
// @route   POST /api/coupons/validate
export const validateCoupon = (req, res) => {
  try {
    const { code, subtotal = 0 } = req.body;

    if (
      typeof code !== "string" ||
      !code.trim() ||
      code.length > 40 ||
      !Number.isFinite(Number(subtotal)) ||
      Number(subtotal) < 0
    ) {
      return res.status(400).json({ success: false, message: "Provide a valid coupon code and non-negative subtotal" });
    }

    const coupon = findCouponByCode(code.trim());

    if (!coupon || !coupon.isActive || (coupon.validUntil && new Date(coupon.validUntil) < new Date())) {
      return res.status(404).json({ success: false, message: "Invalid or expired coupon code" });
    }

    if (Number(subtotal) < (coupon.minOrderAmount || 0)) {
      return res.status(400).json({
        success: false,
        message: `Coupon requires minimum food order value of ₹${coupon.minOrderAmount}. Add ₹${coupon.minOrderAmount - Number(subtotal)} more.`
      });
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (Number(subtotal) * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    } else {
      discount = coupon.discountValue;
    }
    discount = Math.round(discount * 100) / 100;

    res.json({
      success: true,
      message: `Coupon ${coupon.code} applied! Saved ₹${discount}`,
      data: {
        code: coupon.code,
        discount,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new coupon (Admin)
// @route   POST /api/coupons
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType = "percentage",
      discountValue,
      minOrderAmount = 0,
      maxDiscountAmount = 150,
      validUntil = "2027-12-31"
    } = req.body;

    if (
      typeof code !== "string" ||
      !/^[A-Za-z0-9_-]{3,40}$/.test(code.trim()) ||
      !Number.isFinite(Number(discountValue)) ||
      Number(discountValue) <= 0 ||
      !["percentage", "flat"].includes(discountType) ||
      !Number.isFinite(Number(minOrderAmount)) ||
      Number(minOrderAmount) < 0 ||
      !Number.isFinite(Number(maxDiscountAmount)) ||
      Number(maxDiscountAmount) < 0 ||
      (discountType === "percentage" && Number(discountValue) > 100) ||
      (validUntil && !Number.isFinite(Date.parse(validUntil)))
    ) {
      return res.status(400).json({ success: false, message: "Coupon fields contain invalid values" });
    }

    if (findCouponByCode(code.trim())) {
      return res.status(409).json({ success: false, message: "A coupon with this code already exists" });
    }

    const newCoupon = {
      _id: createId(),
      code: code.trim().toUpperCase(),
      description: description || `${discountValue}${discountType === "percentage" ? "%" : "₹"} OFF`,
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount),
      maxDiscountAmount: Number(maxDiscountAmount),
      validUntil,
      isActive: true,
      usageCount: 0
    };

    await runInMemoryTransaction(["coupons"], () => saveCoupon(newCoupon), req.user);

    res.status(201).json({
      success: true,
      message: `Coupon ${newCoupon.code} created successfully`,
      data: newCoupon
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
