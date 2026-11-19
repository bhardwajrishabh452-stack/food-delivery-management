import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { PageFeedback, PageLoading } from "../../components/PageFeedback";
import {
  ChefHat,
  RefreshCw,
  DollarSign,
  Utensils
} from "lucide-react";

export const RestaurantDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [busyOrderId, setBusyOrderId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const restaurantId = user?.restaurantId;

  const fetchOrdersAndStats = async (showLoader = false) => {
    if (!restaurantId) {
      setOrders([]);
      setEarnings(null);
      setLoading(false);
      return;
    }

    try {
      if (showLoader) setLoading(true);
      setError("");
      const [ordersRes, earningsRes] = await Promise.all([
        api.restaurants.getOrders(restaurantId),
        api.restaurants.getEarnings(restaurantId)
      ]);

      if (ordersRes.success) setOrders(ordersRes.data);
      if (earningsRes.success) setEarnings(earningsRes.data);
    } catch (err) {
      setError(err.message || "Unable to load restaurant dashboard.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (!restaurantId) return undefined;
    fetchOrdersAndStats(true);
    const interval = setInterval(() => fetchOrdersAndStats(), 5000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setBusyOrderId(orderId);
      setError("");
      setNotice("");
      await api.orders.updateStatus(orderId, newStatus);
      await fetchOrdersAndStats();
      setNotice("Order status updated.");
    } catch (err) {
      setError("Error updating order status: " + err.message);
    } finally {
      setBusyOrderId("");
    }
  };

  const activeOrders = orders.filter(
    (o) => o.status === "PLACED" || o.status === "CONFIRMED" || o.status === "PREPARING"
  );
  const readyOrders = orders.filter((o) => o.status === "READY_FOR_PICKUP" || o.status === "OUT_FOR_DELIVERY");
  const completedOrders = orders.filter((o) => o.status === "DELIVERED" || o.status === "CANCELLED");

  const tabOrders =
    activeTab === "active"
      ? activeOrders
      : activeTab === "ready"
      ? readyOrders
      : completedOrders;
  const query = search.trim().toLowerCase();
  const displayedOrders = tabOrders
    .filter((order) => !query || [
      order.orderNumber,
      order.customerName,
      order.items?.map((item) => item.name).join(" ")
    ].some((value) => String(value || "").toLowerCase().includes(query)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!restaurantId) {
    return (
      <div className="card" style={{ maxWidth: "640px", margin: "48px auto", padding: "28px", textAlign: "center" }}>
        <h1>Restaurant account required</h1>
        <p style={{ color: "var(--gray-500)", margin: "12px 0 20px" }}>
          Sign in with a registered restaurant partner account to view its orders and operations.
        </p>
        <Link to="/login" className="btn btn-primary">Sign In</Link>
      </div>
    );
  }

  if (loading) return <PageLoading label="Loading kitchen dashboard..." />;

  return (
    <div style={{ paddingBottom: "60px" }}>
      {/* Restaurant Header & Navigation Sub-bar */}
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
              background: "#fef3c7",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <ChefHat size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--dark)" }}>
              Kitchen Orders &amp; Operations Panel
            </h1>
            <div style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
              Logged in as <b>{user?.name || "Restaurant partner"}</b> &bull; Real-time order dispatch
            </div>
          </div>
        </div>

        {/* Panel Sub-Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link to="/restaurant-panel/menu" className="btn btn-outline btn-sm">
            <Utensils size={14} /> Menu Manager
          </Link>
          <Link to="/restaurant-panel/earnings" className="btn btn-outline btn-sm">
            <DollarSign size={14} /> Settlements Ledger
          </Link>
          <button onClick={() => fetchOrdersAndStats(true)} disabled={loading} className="btn btn-dark btn-sm">
            <RefreshCw size={14} /> {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <PageFeedback message={error} />
      <PageFeedback message={notice} type="success" />

      {/* KPI Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "32px"
        }}
      >
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Active Kitchen Queue
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#d97706", margin: "4px 0" }}>
            {activeOrders.length}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>Orders currently cooking</div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Ready for Rider
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", margin: "4px 0" }}>
            {readyOrders.length}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>Packed and handed off</div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Gross Food Sales
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--dark)", margin: "4px 0" }}>
            ₹{earnings?.totalFoodSales || 0}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>From {orders.length} total orders</div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Net Settlement Balance (After {earnings?.commissionRate || 15}% Commission)
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#15803d", margin: "4px 0" }}>
            ₹{earnings?.netPayable || 0}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>Platform fee ₹{earnings?.platformCommission || 0}</div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          borderBottom: "2px solid var(--gray-200)",
          marginBottom: "24px"
        }}
      >
        <button
          aria-pressed={activeTab === "active"}
          onClick={() => setActiveTab("active")}
          style={{
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: "0.95rem",
            color: activeTab === "active" ? "#d97706" : "var(--gray-500)",
            borderBottom: activeTab === "active" ? "3px solid #d97706" : "3px solid transparent",
            marginBottom: "-2px",
            background: "transparent"
          }}
        >
          Cooking / Incoming ({activeOrders.length})
        </button>

        <button
          aria-pressed={activeTab === "ready"}
          onClick={() => setActiveTab("ready")}
          style={{
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: "0.95rem",
            color: activeTab === "ready" ? "var(--primary)" : "var(--gray-500)",
            borderBottom: activeTab === "ready" ? "3px solid var(--primary)" : "3px solid transparent",
            marginBottom: "-2px",
            background: "transparent"
          }}
        >
          Dispatched / Ready ({readyOrders.length})
        </button>

        <button
          aria-pressed={activeTab === "history"}
          onClick={() => setActiveTab("history")}
          style={{
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: "0.95rem",
            color: activeTab === "history" ? "var(--dark)" : "var(--gray-500)",
            borderBottom: activeTab === "history" ? "3px solid var(--dark)" : "3px solid transparent",
            marginBottom: "-2px",
            background: "transparent"
          }}
        >
          Completed History ({completedOrders.length})
        </button>
      </div>

      <div style={{ marginBottom: "18px" }}>
        <label htmlFor="restaurant-order-search">Search orders</label>
        <input
          id="restaurant-order-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Order number, customer, or dish"
          style={{ width: "100%", maxWidth: "420px", padding: "10px 12px", border: "1px solid var(--gray-300)", borderRadius: "8px" }}
        />
      </div>

      {/* Order Cards List */}
      {displayedOrders.length === 0 ? (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🍳</div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "4px" }}>
            No orders in this stage
          </h3>
          <p style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>
            New customer orders will ring here automatically via live WebSocket sync.
          </p>
        </div>
      ) : (
        <div className="responsive-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "20px" }}>
          {displayedOrders.map((order) => (
            <div
              key={order._id}
              className="card"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                borderLeft:
                  order.status === "PLACED"
                    ? "6px solid #f59e0b"
                    : order.status === "CONFIRMED"
                    ? "6px solid #6366f1"
                    : order.status === "PREPARING"
                    ? "6px solid #eab308"
                    : "6px solid #10b981"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--dark)" }}>
                    #{order.orderNumber}
                  </span>
                  <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              {/* Customer details */}
              <div style={{ background: "var(--gray-50)", padding: "10px", borderRadius: "8px", marginBottom: "14px", fontSize: "0.85rem" }}>
                <div style={{ fontWeight: 700, color: "var(--dark)" }}>{order.customerName}</div>
                <div style={{ color: "var(--gray-500)", fontSize: "0.78rem" }}>
                  Delivery to: {order.deliveryAddress?.street}
                </div>
              </div>

              {/* Items List */}
              <div style={{ flex: 1, marginBottom: "16px" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", marginBottom: "6px" }}>
                  Dishes to Prepare:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {order.items?.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                      <span>
                        <b>{item.quantity}x</b> {item.name}
                      </span>
                      <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons for Kitchen Lifecycle */}
              <div style={{ borderTop: "1px solid var(--gray-200)", paddingTop: "14px", display: "flex", gap: "8px" }}>
                {order.status === "PLACED" && (
                  <button
                    onClick={() => handleUpdateStatus(order._id, "CONFIRMED")}
                    disabled={busyOrderId === order._id}
                    className="btn btn-primary"
                    style={{ flex: 1, borderRadius: "8px", padding: "8px" }}
                  >
                    {busyOrderId === order._id ? "Updating..." : "Accept Order"}
                  </button>
                )}

                {order.status === "CONFIRMED" && (
                  <button
                    onClick={() => handleUpdateStatus(order._id, "PREPARING")}
                    disabled={busyOrderId === order._id}
                    className="btn btn-secondary"
                    style={{ flex: 1, borderRadius: "8px", padding: "8px" }}
                  >
                    {busyOrderId === order._id ? "Updating..." : "Start Cooking"}
                  </button>
                )}

                {order.status === "PREPARING" && (
                  <button
                    onClick={() => handleUpdateStatus(order._id, "READY_FOR_PICKUP")}
                    disabled={busyOrderId === order._id}
                    className="btn btn-primary"
                    style={{ flex: 1, borderRadius: "8px", padding: "8px" }}
                  >
                    {busyOrderId === order._id ? "Updating..." : "Food Ready & Packed"}
                  </button>
                )}

                {order.status === "READY_FOR_PICKUP" && (
                  <div style={{ fontSize: "0.85rem", color: "var(--primary-hover)", fontWeight: 700, width: "100%", textAlign: "center" }}>
                    ✓ Waiting for Rider ({order.riderName || "Auto-dispatching..."})
                  </div>
                )}

                <Link
                  to={`/track/${order._id}`}
                  className="btn btn-outline btn-sm"
                  style={{ borderRadius: "8px" }}
                >
                  Live Map
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
