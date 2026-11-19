import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { PageFeedback, PageLoading } from "../../components/PageFeedback";
import {
  ShoppingBag,
  Clock,
  ArrowRight,
  MapPin,
  FileText,
  RotateCcw
} from "lucide-react";

export const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.orders.getMyOrders();
        if (res.success) {
          setOrders(res.data);
        }
      } catch (err) {
        setError(err.message || "Unable to load order history.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const query = search.trim().toLowerCase();
  const visibleOrders = orders
    .filter((order) => {
      const active = order.status !== "DELIVERED" && order.status !== "CANCELLED";
      const matchesStatus = statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && active) ||
        order.status === statusFilter;
      const matchesSearch = !query || [
        order.restaurantName,
        order.orderNumber,
        order.items?.map((item) => item.name).join(" ")
      ].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => sortBy === "oldest"
      ? new Date(a.createdAt) - new Date(b.createdAt)
      : new Date(b.createdAt) - new Date(a.createdAt));

  if (loading) return <PageLoading label="Loading your order history..." />;

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto", paddingBottom: "60px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--dark)", marginBottom: "4px" }}>
          Past Food Orders
        </h1>
        <p style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>
          Track ongoing deliveries or reorder your favorite meals.
        </p>
      </div>

      <PageFeedback message={error} />

      {orders.length > 0 && (
        <div className="dashboard-controls" style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "12px", marginBottom: "18px" }}>
          <div>
            <label htmlFor="order-history-search">Search orders</label>
            <input id="order-history-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Restaurant, order number, or dish" />
          </div>
          <div>
            <label htmlFor="order-history-status">Status</label>
            <select id="order-history-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All orders</option>
              <option value="ACTIVE">Active</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label htmlFor="order-history-sort">Sort by</label>
            <select id="order-history-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "48px 24px",
            textAlign: "center"
          }}
        >
          <div
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              background: "var(--gray-100)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px"
            }}
          >
            <ShoppingBag size={32} color="var(--gray-400)" />
          </div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "8px" }}>
            No orders placed yet
          </h3>
          <p style={{ color: "var(--gray-500)", marginBottom: "20px" }}>
            When you place an order, it will appear here with live tracking.
          </p>
          <Link to="/" className="btn btn-primary">
            Explore Restaurants
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {visibleOrders.map((order) => {
            const isActive = order.status !== "DELIVERED" && order.status !== "CANCELLED";

            return (
              <div
                key={order._id}
                className="card"
                style={{
                  padding: "24px",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "20px"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--dark)" }}>
                      {order.restaurantName}
                    </h3>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div style={{ fontSize: "0.825rem", color: "var(--gray-500)", marginBottom: "12px" }}>
                    Order #{order.orderNumber} &bull; {new Date(order.createdAt).toLocaleDateString()} at{" "}
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>

                  {/* Items summary */}
                  <div style={{ fontSize: "0.875rem", color: "var(--gray-700)" }}>
                    {order.items?.map((item) => `${item.quantity}x ${item.name}`).join(", ")}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--dark)" }}>
                      ₹{order.pricing?.total}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>
                      Paid via {order.payment?.method}
                    </div>
                  </div>

                  {isActive ? (
                    <Link
                      to={`/track/${order._id}`}
                      className="btn btn-primary"
                      style={{ borderRadius: "10px", padding: "10px 18px" }}
                    >
                      <span>Track Live</span>
                      <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <Link
                      to={`/restaurant/${order.restaurantId}`}
                      className="btn btn-outline"
                      style={{ borderRadius: "10px", padding: "10px 18px" }}
                    >
                      <RotateCcw size={14} />
                      <span>Reorder</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
          {visibleOrders.length === 0 && (
            <div className="card" style={{ padding: "28px", textAlign: "center", color: "var(--gray-500)" }}>
              No orders match your search and status filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
