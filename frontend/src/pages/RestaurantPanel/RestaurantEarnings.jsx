import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft,
  Building
} from "lucide-react";

export const RestaurantEarnings = () => {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    const fetchEarnings = async () => {
      try {
        setLoading(true);
        const res = await api.restaurants.getEarnings(restaurantId);
        if (res.success) {
          setEarnings(res.data);
        }
      } catch (err) {
        console.error("Failed to load earnings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, [restaurantId]);

  if (!restaurantId) {
    return (
      <div className="card" style={{ maxWidth: "640px", margin: "48px auto", padding: "28px", textAlign: "center" }}>
        <h1>Restaurant account required</h1>
        <p style={{ color: "var(--gray-500)", margin: "12px 0 20px" }}>
          Sign in with a registered restaurant partner account to view its earnings.
        </p>
        <Link to="/login" className="btn btn-primary">Sign In</Link>
      </div>
    );
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px 0" }}>Loading vendor financial ledger...</div>;
  }

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto", paddingBottom: "60px" }}>
      <div style={{ marginBottom: "28px" }}>
        <Link
          to="/restaurant-panel"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--gray-600)",
            fontSize: "0.85rem",
            fontWeight: 600,
            marginBottom: "8px"
          }}
        >
          <ArrowLeft size={16} /> Back to Orders Dashboard
        </Link>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--dark)" }}>
          Financial Settlement &amp; Commission Ledger
        </h1>
        <div style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
          Breakdown of order totals, platform commission, and the calculated settlement balance.
        </div>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
          marginBottom: "32px"
        }}
      >
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Gross Food Sales
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--dark)", margin: "4px 0" }}>
            ₹{earnings?.totalFoodSales || 0}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>
            Across {earnings?.totalOrders || 0} completed orders
          </div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Platform Commission ({earnings?.commissionRate}%)
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--danger)", margin: "4px 0" }}>
            - ₹{earnings?.platformCommission || 0}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>FDS service &amp; hosting charge</div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Order Tax
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", margin: "4px 0" }}>
            + ₹{earnings?.totalTax || 0}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>Calculated from order totals</div>
        </div>

        <div
          className="card"
          style={{
            padding: "20px",
            background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
            color: "#ffffff"
          }}
        >
          <div style={{ fontSize: "0.8rem", opacity: 0.8, fontWeight: 700, textTransform: "uppercase" }}>
            Net Settlement Balance
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, margin: "4px 0", color: "#34d399" }}>
            ₹{earnings?.netPayable || 0}
          </div>
          <div style={{ fontSize: "0.78rem", opacity: 0.8 }}>No bank transfer is initiated by this prototype</div>
        </div>
      </div>

      {/* Settlement information */}
      <div className="card" style={{ padding: "24px", marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Building size={20} color="var(--primary)" />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--dark)" }}>
            Settlement Details
          </h3>
        </div>
        <div style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>
          Payout bank details are not configured in this prototype. Administrator settlement actions create records only and do not transfer funds.
        </div>
      </div>
    </div>
  );
};
