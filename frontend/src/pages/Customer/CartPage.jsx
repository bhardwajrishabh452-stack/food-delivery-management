import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { api } from "../../services/api";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Check,
  AlertCircle
} from "lucide-react";

export const CartPage = () => {
  const {
    cartItems,
    restaurant,
    coupon,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    tax,
    deliveryFee,
    packagingFee,
    discount,
    total,
    applyCoupon,
    removeCoupon
  } = useCart();

  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [deliveryAddress, setDeliveryAddress] = useState({
    street: "Flat 402, Lotus Towers, Sector 18",
    city: "New Delhi",
    lat: 28.6139,
    lng: 77.2090,
    contactPhone: "+91 98765 43210"
  });

  const availableQuickCoupons = [
    { code: "FDSFIRST", desc: "50% OFF (First Order)", min: 200 },
    { code: "TASTY30", desc: "30% OFF (Min ₹250)", min: 250 },
    { code: "FLAT50", desc: "Flat ₹50 OFF", min: 300 }
  ];

  const handleApplyCoupon = async (codeToApply) => {
    setCouponError("");
    setCouponSuccess("");
    const targetCode = (codeToApply || couponInput).trim().toUpperCase();

    if (!targetCode) {
      setCouponError("Please enter a coupon code");
      return;
    }

    try {
      setApplyingCoupon(true);
      const res = await api.coupons.validate(targetCode, subtotal);
      if (res.success) {
        applyCoupon({
          code: res.data.code,
          discount: res.data.discount,
          discountType: res.data.discountType,
          discountValue: res.data.discountValue,
          minOrderAmount: 0
        });
        setCouponSuccess(res.message);
        setCouponInput("");
      }
    } catch (err) {
      setCouponError(err.message || "Failed to apply coupon");
    } finally {
      setApplyingCoupon(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div
        className="card"
        style={{
          maxWidth: "600px",
          margin: "60px auto",
          padding: "48px 24px",
          textAlign: "center"
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "var(--gray-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px"
          }}
        >
          <ShoppingBag size={36} color="var(--gray-400)" />
        </div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "8px" }}>
          Your cart is hungry!
        </h2>
        <p style={{ color: "var(--gray-500)", marginBottom: "24px" }}>
          Explore our wide selection of delicious restaurants and add your favorite dishes.
        </p>
        <Link to="/" className="btn btn-primary" style={{ padding: "12px 28px" }}>
          Explore Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto", paddingBottom: "60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--dark)" }}>
          Your Food Cart
        </h1>
        <button
          onClick={clearCart}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--danger)",
            background: "transparent",
            fontSize: "0.85rem",
            fontWeight: 600
          }}
        >
          <Trash2 size={16} /> Clear Cart
        </button>
      </div>

      <div className="two-column-layout" style={{ gridTemplateColumns: "1.3fr 1fr", gap: "28px", alignItems: "start" }}>
        {/* Left Column: Items List & Address */}
        <div>
          {/* Restaurant Header */}
          <div
            className="card"
            style={{
              padding: "18px 24px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--gray-400)", textTransform: "uppercase", fontWeight: 700 }}>
                Ordering from
              </div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--dark)" }}>
                {restaurant?.name}
              </div>
              <div style={{ fontSize: "0.825rem", color: "var(--gray-500)" }}>
                {restaurant?.address?.street}, {restaurant?.address?.city}
              </div>
            </div>
            <Link
              to={`/restaurant/${restaurant?._id}`}
              style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.85rem" }}
            >
              + Add More Items
            </Link>
          </div>

          {/* Cart Items */}
          <div className="card" style={{ padding: "20px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "16px", color: "var(--dark)" }}>
              Order Items
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {cartItems.map((item) => (
                <div
                  key={item.menuItemId || item._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: "14px",
                    borderBottom: "1px solid var(--gray-100)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className={`badge ${item.isVeg ? "badge-veg" : "badge-non-veg"}`} style={{ padding: "2px 6px" }}>
                      {item.isVeg ? "V" : "NV"}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--dark)" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "0.825rem", color: "var(--gray-500)" }}>
                        ₹{item.price} each
                      </div>
                    </div>
                  </div>

                  <div className="cart-item-controls" style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                    {/* Quantity modifier */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background: "var(--gray-100)",
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontWeight: 700,
                        fontSize: "0.85rem"
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(item.menuItemId || item._id, -1)}
                        aria-label={`Decrease ${item.name} quantity`}
                        style={{ background: "transparent", display: "flex", alignItems: "center" }}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId || item._id, 1)}
                        aria-label={`Increase ${item.name} quantity`}
                        style={{ background: "transparent", display: "flex", alignItems: "center" }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div style={{ fontWeight: 700, minWidth: "60px", textAlign: "right" }}>
                      ₹{item.price * item.quantity}
                    </div>

                    <button
                      onClick={() => removeFromCart(item.menuItemId || item._id)}
                      aria-label={`Remove ${item.name} from cart`}
                      style={{ background: "transparent", color: "var(--gray-400)" }}
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <MapPin size={18} color="var(--primary)" />
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--dark)" }}>
                Delivery Address
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                type="text"
                aria-label="Delivery street address"
                value={deliveryAddress.street}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                placeholder="Street address / Flat number"
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--gray-300)",
                  fontSize: "0.9rem"
                }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <input
                  type="text"
                  aria-label="Delivery city"
                  value={deliveryAddress.city}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                  placeholder="City"
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--gray-300)",
                    fontSize: "0.9rem"
                  }}
                />
                <input
                  type="text"
                  aria-label="Contact phone"
                  value={deliveryAddress.contactPhone}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, contactPhone: e.target.value })}
                  placeholder="Contact Phone"
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--gray-300)",
                    fontSize: "0.9rem"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Coupons & Bill Details */}
        <div>
          {/* Coupon Box */}
          <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Tag size={18} color="#f97316" />
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--dark)" }}>
                Coupons &amp; Offers
              </h3>
            </div>

            {coupon ? (
              <div
                style={{
                  background: "var(--primary-light)",
                  border: "1px solid #86efac",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: "var(--primary-hover)", fontSize: "0.95rem" }}>
                    {coupon.code} APPLIED
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#15803d" }}>
                    You saved ₹{discount} on this meal!
                  </div>
                </div>
                <button
                  onClick={removeCoupon}
                  style={{
                    background: "transparent",
                    color: "var(--danger)",
                    fontWeight: 700,
                    fontSize: "0.825rem"
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <input
                    type="text"
                    aria-label="Coupon code"
                    placeholder="Enter promo code..."
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--gray-300)",
                      fontSize: "0.875rem",
                      textTransform: "uppercase"
                    }}
                  />
                  <button
                    onClick={() => handleApplyCoupon()}
                    disabled={applyingCoupon}
                    className="btn btn-dark btn-sm"
                    style={{ borderRadius: "8px" }}
                  >
                    {applyingCoupon ? "Applying..." : "Apply"}
                  </button>
                </div>

                {couponError && (
                  <div role="alert" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--danger)", fontSize: "0.8rem", marginBottom: "10px" }}>
                    <AlertCircle size={14} />
                    <span>{couponError}</span>
                  </div>
                )}
                {couponSuccess && (
                  <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--success)", fontSize: "0.8rem", marginBottom: "10px" }}>
                    <Check size={14} />
                    <span>{couponSuccess}</span>
                  </div>
                )}

                {/* Quick select coupon pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {availableQuickCoupons.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => handleApplyCoupon(c.code)}
                      disabled={applyingCoupon}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        background: "var(--gray-100)",
                        border: "1px dashed var(--gray-400)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "var(--gray-700)",
                        textAlign: "left"
                      }}
                    >
                      <span style={{ color: "#f97316" }}>{c.code}</span> &bull; {c.desc}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bill Summary */}
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "18px", color: "var(--dark)" }}>
              Bill Details
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem", color: "var(--gray-700)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Item Subtotal</span>
                <span style={{ fontWeight: 600 }}>₹{subtotal}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Delivery Partner Fee</span>
                <span style={{ fontWeight: 600 }}>₹{deliveryFee}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Restaurant Packaging</span>
                <span style={{ fontWeight: 600 }}>₹{packagingFee}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Govt. Taxes (5% GST)</span>
                <span style={{ fontWeight: 600 }}>₹{tax}</span>
              </div>

              {discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#15803d", fontWeight: 700 }}>
                  <span>Discount ({coupon?.code})</span>
                  <span>- ₹{discount}</span>
                </div>
              )}

              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "14px",
                  borderTop: "2px dashed var(--gray-200)",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: "var(--dark)"
                }}
              >
                <span>To Pay</span>
                <span>₹{total}</span>
              </div>
            </div>

            <button
              onClick={() => navigate("/checkout", { state: { deliveryAddress } })}
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "24px", borderRadius: "12px" }}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={18} />
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                marginTop: "14px",
                fontSize: "0.78rem",
                color: "var(--gray-500)"
              }}
            >
              <ShieldCheck size={14} color="#10b981" />
              <span>Payment is simulated in this prototype; no real charge is made.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
