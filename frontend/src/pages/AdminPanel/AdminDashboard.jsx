import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { PageFeedback, PageLoading } from "../../components/PageFeedback";
import {
  ShieldCheck,
  DollarSign,
  ShoppingBag,
  Store,
  Tag,
  ArrowRight,
  RefreshCw,
  Users
} from "lucide-react";

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [settlementData, setSettlementData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setError("");
      const [ordersRes, settRes] = await Promise.all([
        api.orders.getAll(),
        api.settlements.getOverview()
      ]);

      if (ordersRes.success) setOrders(ordersRes.data);
      if (settRes.success) setSettlementData(settRes.data);
    } catch (err) {
      setError(err.message || "Unable to load platform dashboard data.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(), 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter((order) => {
    const active = !["DELIVERED", "CANCELLED"].includes(order.status);
    const unassigned = !order.riderId && !order.riderName && active;
    const matchesStatus = selectedStatus === "ALL" ||
      (selectedStatus === "ACTIVE" && active) ||
      (selectedStatus === "UNASSIGNED" && unassigned) ||
      order.status === selectedStatus;
    const matchesPayment = paymentStatus === "ALL" ||
      (paymentStatus === "COD" ? order.payment?.method === "COD" : order.payment?.status === paymentStatus);
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [
      order.orderNumber,
      order.customerName,
      order.restaurantName,
      order.riderName
    ].some((value) => String(value || "").toLowerCase().includes(query));
    return matchesStatus && matchesPayment && matchesSearch;
  });
  const activeOrders = orders.filter((order) =>
    !["DELIVERED", "CANCELLED"].includes(order.status)
  ).length;
  const deliveredOrders = orders.filter((order) => order.status === "DELIVERED").length;
  const unassignedOrders = orders.filter((order) =>
    !order.riderId && !order.riderName && !["DELIVERED", "CANCELLED"].includes(order.status)
  ).length;

  if (loading) return <PageLoading label="Loading platform dashboards..." />;

  const summary = settlementData?.summary || {
    totalGMV: 0,
    totalPlatformCommission: 0,
    restaurantNetPayouts: 0
  };

  return (
    <div style={{ paddingBottom: "60px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "28px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#e0e7ff",
              color: "#4338ca",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--dark)" }}>
              FDS Enterprise Administration
            </h1>
            <div style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
              Logged in as <b>{user?.name || "Platform administrator"}</b> &bull; Global platform metrics, order dispatch supervision, and commission settlement engine.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link to="/admin-panel/settlements" className="btn btn-primary btn-sm">
            <DollarSign size={14} /> Settlements Ledger
          </Link>
          <Link to="/admin-panel/coupons" className="btn btn-outline btn-sm">
            <Tag size={14} /> Coupons Manager
          </Link>
          <Link to="/admin-panel/restaurants" className="btn btn-outline btn-sm">
            <Store size={14} /> Restaurants
          </Link>
          <Link to="/admin-panel/accounts" className="btn btn-outline btn-sm">
            <Users size={14} /> Accounts &amp; Approvals
          </Link>
          <Link to="/admin-panel/menus" className="btn btn-outline btn-sm">
            <ShoppingBag size={14} /> Menus
          </Link>
          <Link to="/admin-panel/payments" className="btn btn-outline btn-sm">
            <DollarSign size={14} /> Payments
          </Link>
          <button onClick={() => fetchData(true)} disabled={loading} className="btn btn-dark btn-sm">
            <RefreshCw size={14} /> {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <PageFeedback message={error} />

      <div className="responsive-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        {[
          ["ALL", "Total Orders", orders.length],
          ["ACTIVE", "Active Orders", activeOrders],
          ["DELIVERED", "Delivered", deliveredOrders],
          ["UNASSIGNED", "Awaiting Rider", unassignedOrders]
        ].map(([filter, label, count]) => (
          <button
            key={filter}
            type="button"
            className="card"
            aria-pressed={selectedStatus === filter}
            onClick={() => setSelectedStatus(filter)}
            style={{ padding: "16px", textAlign: "left", borderColor: selectedStatus === filter ? "var(--primary)" : undefined }}
          >
            <div>{label}</div><strong>{count}</strong>
          </button>
        ))}
      </div>

      {/* KPI Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
          marginBottom: "36px"
        }}
      >
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Gross Platform Volume (GMV)
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--dark)", margin: "4px 0" }}>
            ₹{summary.totalGMV}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>Total food sales + tax + delivery</div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Platform Commission Earned
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#15803d", margin: "4px 0" }}>
            ₹{summary.totalPlatformCommission}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>Based on restaurant commission settings</div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Total Food Orders
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", margin: "4px 0" }}>
            {orders.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>Across all active kitchens</div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Restaurant Net Payable
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#d97706", margin: "4px 0" }}>
            ₹{summary.restaurantNetPayouts}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>Ready for settlement payout</div>
        </div>
      </div>

      {/* Live Orders Monitor */}
      <div className="card" style={{ padding: "24px", marginBottom: "32px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "20px"
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--dark)" }}>
              Platform Live Orders Feed
            </h3>
            <div style={{ fontSize: "0.825rem", color: "var(--gray-500)" }}>
              Orders refresh automatically every 10 seconds with current fulfillment and payment status.
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
            <label htmlFor="admin-order-search" style={{ fontSize: "0.85rem", color: "var(--gray-500)", fontWeight: 600 }}>Search</label>
            <input
              id="admin-order-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order, customer, restaurant, rider"
              style={{ maxWidth: "260px", padding: "7px 10px", border: "1px solid var(--gray-300)", borderRadius: "8px" }}
            />
            <label htmlFor="admin-order-status" style={{ fontSize: "0.85rem", color: "var(--gray-500)", fontWeight: 600 }}>Status</label>
            <select
              id="admin-order-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--gray-300)",
                fontSize: "0.85rem"
              }}
            >
              <option value="ALL">All Statuses ({orders.length})</option>
              <option value="ACTIVE">Active</option>
              <option value="UNASSIGNED">Awaiting Rider</option>
              <option value="PLACED">Placed</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PREPARING">Preparing</option>
              <option value="READY_FOR_PICKUP">Ready for Pickup</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <label htmlFor="admin-payment-status" style={{ fontSize: "0.85rem", color: "var(--gray-500)", fontWeight: 600 }}>Payment</label>
            <select id="admin-payment-status" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
              <option value="ALL">All payments</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="COD">Cash on delivery</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="responsive-table">
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--gray-50)", borderBottom: "1px solid var(--gray-200)", fontSize: "0.8rem", color: "var(--gray-500)", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 16px" }}>Order</th>
                <th style={{ padding: "12px 16px" }}>Customer</th>
                <th style={{ padding: "12px 16px" }}>Restaurant</th>
                <th style={{ padding: "12px 16px" }}>Rider</th>
                <th style={{ padding: "12px 16px" }}>Total</th>
                <th style={{ padding: "12px 16px" }}>Payment</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Live Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o._id} style={{ borderBottom: "1px solid var(--gray-100)", fontSize: "0.875rem" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--dark)" }}>
                    #{o.orderNumber}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{o.customerName}</td>
                  <td style={{ padding: "12px 16px", color: "var(--gray-700)" }}>{o.restaurantName}</td>
                  <td style={{ padding: "12px 16px", color: "var(--gray-700)" }}>
                    {o.riderName || <span style={{ color: "var(--gray-400)" }}>Awaiting Rider</span>}
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 700 }}>₹{o.pricing?.total}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {o.payment?.method || "—"}<br />
                    <small>{o.payment?.status || "—"}</small>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <Link to={`/track/${o._id}`} className="btn btn-outline btn-sm" style={{ padding: "4px 8px" }}>
                      Track Live <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: "28px", textAlign: "center", color: "var(--gray-500)" }}>
                    No orders match the selected search and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
