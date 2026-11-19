import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { api } from "../../services/api";
import {
  CreditCard,
  QrCode,
  Building,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowLeft
} from "lucide-react";

export const CheckoutPage = () => {
  const { cartItems, restaurant, coupon, total, clearCart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [upiId, setUpiId] = useState("alex.johnson@oksbi");
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const deliveryAddress = location.state?.deliveryAddress || {
    street: "Flat 402, Lotus Towers, Sector 18",
    city: "New Delhi",
    lat: 28.6139,
    lng: 77.2090,
    contactPhone: "+91 98765 43210"
  };

  const handlePlaceOrder = async () => {
    try {
      setProcessing(true);
      setPaymentError("");

      // The server calculates the authoritative total from current menu prices.
      const orderPayload = {
        restaurantId: restaurant._id,
        items: cartItems.map((i) => ({
          menuItemId: i.menuItemId || i._id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          isVeg: i.isVeg
        })),
        couponCode: coupon ? coupon.code : null,
        deliveryAddress,
        paymentMethod
      };

      const orderRes = await api.orders.create(orderPayload);
      if (!orderRes.success) {
        throw new Error(orderRes.message || "Failed to place order");
      }

      clearCart();
      navigate(`/track/${orderRes.data._id}`);
    } catch (err) {
      setPaymentError(err.message || "Failed to complete transaction");
      setProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <h2>No active order to checkout.</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: "16px" }}>
          Return to Explore
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "60px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link
          to="/cart"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--gray-600)",
            fontWeight: 600,
            fontSize: "0.875rem",
            marginBottom: "12px"
          }}
        >
          <ArrowLeft size={16} /> Back to Cart
        </Link>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--dark)" }}>
          Payment &amp; Final Confirmation
        </h1>
      </div>

      <div className="two-column-layout" style={{ gridTemplateColumns: "1.4fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* Payment Methods */}
        <div className="card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px", color: "var(--dark)" }}>
            Select Payment Method
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* UPI Option */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "16px",
                borderRadius: "12px",
                border: paymentMethod === "UPI" ? "2px solid var(--primary)" : "1px solid var(--gray-200)",
                background: paymentMethod === "UPI" ? "var(--primary-light)" : "#ffffff",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "UPI"}
                onChange={() => setPaymentMethod("UPI")}
                style={{ accentColor: "var(--primary)" }}
              />
              <QrCode size={22} color={paymentMethod === "UPI" ? "var(--primary)" : "var(--gray-600)"} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Instant UPI / QR Code</div>
                <div style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>
                  Google Pay, PhonePe, Paytm, BHIM UPI
                </div>
              </div>
            </label>

            {paymentMethod === "UPI" && (
              <div
                style={{
                  background: "#ffffff",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px dashed #86efac",
                  marginLeft: "30px",
                  fontSize: "0.85rem"
                }}
              >
                <div style={{ color: "var(--gray-600)", marginBottom: "4px" }}>UPI Virtual Payment Address:</div>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--gray-300)"
                  }}
                />
              </div>
            )}

            {/* Credit / Debit Card Option */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "16px",
                borderRadius: "12px",
                border: paymentMethod === "CARD" ? "2px solid var(--primary)" : "1px solid var(--gray-200)",
                background: paymentMethod === "CARD" ? "var(--primary-light)" : "#ffffff",
                cursor: "pointer"
              }}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "CARD"}
                onChange={() => setPaymentMethod("CARD")}
                style={{ accentColor: "var(--primary)" }}
              />
              <CreditCard size={22} color={paymentMethod === "CARD" ? "var(--primary)" : "var(--gray-600)"} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Credit &amp; Debit Cards</div>
                <div style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>
                  Visa, Mastercard, RuPay &amp; Diners
                </div>
              </div>
            </label>

            {/* Net Banking */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "16px",
                borderRadius: "12px",
                border: paymentMethod === "NETBANKING" ? "2px solid var(--primary)" : "1px solid var(--gray-200)",
                background: paymentMethod === "NETBANKING" ? "var(--primary-light)" : "#ffffff",
                cursor: "pointer"
              }}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "NETBANKING"}
                onChange={() => setPaymentMethod("NETBANKING")}
                style={{ accentColor: "var(--primary)" }}
              />
              <Building size={22} color={paymentMethod === "NETBANKING" ? "var(--primary)" : "var(--gray-600)"} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Net Banking</div>
                <div style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>
                  All Indian banks supported (HDFC, ICICI, SBI, Axis)
                </div>
              </div>
            </label>

            {/* Cash on Delivery */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "16px",
                borderRadius: "12px",
                border: paymentMethod === "COD" ? "2px solid var(--primary)" : "1px solid var(--gray-200)",
                background: paymentMethod === "COD" ? "var(--primary-light)" : "#ffffff",
                cursor: "pointer"
              }}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "COD"}
                onChange={() => setPaymentMethod("COD")}
                style={{ accentColor: "var(--primary)" }}
              />
              <Banknote size={22} color={paymentMethod === "COD" ? "var(--primary)" : "var(--gray-600)"} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Cash on Delivery</div>
                <div style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>
                  Pay cash or UPI directly to delivery partner upon arrival
                </div>
              </div>
            </label>
          </div>

          {paymentError && (
            <div role="alert" aria-live="polite" style={{ marginTop: "16px", padding: "10px", background: "#fee2e2", color: "#b91c1c", borderRadius: "8px", fontSize: "0.85rem" }}>
              {paymentError}
            </div>
          )}
        </div>

        {/* Order Summary & Pay Button */}
        <div className="card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "14px", color: "var(--dark)" }}>
            Final Review
          </h3>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>Delivery to:</div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{deliveryAddress.street}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>{deliveryAddress.city}</div>
          </div>

          <div style={{ borderTop: "1px solid var(--gray-200)", paddingTop: "14px", marginBottom: "16px" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--gray-600)", marginBottom: "4px" }}>
              {cartItems.length} items from <b>{restaurant?.name}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: 800, color: "var(--dark)" }}>
              <span>Total Amount</span>
              <span>₹{total}</span>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={processing}
            className="btn btn-primary btn-lg"
            style={{ width: "100%", borderRadius: "12px", opacity: processing ? 0.7 : 1 }}
          >
            {processing ? (
              <span role="status" aria-live="polite">Placing your order...</span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Lock size={16} /> Pay ₹{total} &amp; Place Order
              </span>
            )}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              marginTop: "16px",
              fontSize: "0.78rem",
              color: "var(--gray-500)"
            }}
          >
            <ShieldCheck size={14} color="#10b981" />
            <span>Demo checkout only; no real payment is processed.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
