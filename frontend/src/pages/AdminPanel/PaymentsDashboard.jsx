import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { api } from "../../services/api";
import { PageFeedback, PageLoading } from "../../components/PageFeedback";

export const PaymentsDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [error, setError] = useState("");

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.orders.getAll();
      if (response.success) setOrders(response.data.filter((order) => order.payment));
    } catch (requestError) {
      setError(requestError.message || "Unable to load payment records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const payments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders
      .filter((order) => {
        const status = order.payment?.status || "PENDING";
        const matchesStatus = statusFilter === "ALL" || status === statusFilter;
        const matchesSearch = !query || [
          order.orderNumber,
          order.customerName,
          order.restaurantName,
          order.payment?.transactionId,
          order.payment?.method
        ].some((value) => String(value || "").toLowerCase().includes(query));
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => sortBy === "amount"
        ? (b.pricing?.total || 0) - (a.pricing?.total || 0)
        : new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, search, sortBy, statusFilter]);

  if (loading) return <PageLoading label="Loading payment dashboard..." />;

  const completed = orders.filter((order) => order.payment?.status === "COMPLETED");
  const pending = orders.filter((order) => !order.payment?.status || order.payment.status === "PENDING");
  const completedAmount = completed.reduce((sum, order) => sum + (order.pricing?.total || 0), 0);

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "60px" }}>
      <Link to="/admin-panel" className="btn btn-outline btn-sm" style={{ marginBottom: "12px" }}>
        <ArrowLeft size={14} /> Back to Admin Dashboard
      </Link>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "14px", marginBottom: "20px" }}>
        <div>
          <h1>Payments Dashboard</h1>
          <p style={{ color: "var(--gray-500)" }}>Review payment statuses recorded against platform orders.</p>
        </div>
        <button onClick={fetchPayments} className="btn btn-dark btn-sm" disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <PageFeedback message={error} />
      <PageFeedback message="Payment entries are prototype records; no external payment gateway is connected." type="info" />

      <div className="responsive-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <button type="button" className="card" aria-pressed={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")} style={{ padding: "16px", textAlign: "left" }}>Payment records <strong>{orders.length}</strong></button>
        <button type="button" className="card" aria-pressed={statusFilter === "COMPLETED"} onClick={() => setStatusFilter("COMPLETED")} style={{ padding: "16px", textAlign: "left" }}>Completed <strong>{completed.length}</strong></button>
        <button type="button" className="card" aria-pressed={statusFilter === "PENDING"} onClick={() => setStatusFilter("PENDING")} style={{ padding: "16px", textAlign: "left" }}>Pending <strong>{pending.length}</strong></button>
        <div className="card" style={{ padding: "16px" }}>Completed order value <strong>₹{completedAmount.toFixed(2)}</strong></div>
      </div>

      <div className="dashboard-controls" style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "12px", marginBottom: "18px" }}>
        <div>
          <label htmlFor="payments-search">Search payments</label>
          <input id="payments-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order, customer, method, reference" />
        </div>
        <div>
          <label htmlFor="payments-status">Payment status</label>
          <select id="payments-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
        <div>
          <label htmlFor="payments-sort">Sort by</label>
          <select id="payments-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="newest">Newest first</option>
            <option value="amount">Highest amount</option>
          </select>
        </div>
      </div>

      <div className="card responsive-table">
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "var(--gray-50)", textTransform: "uppercase", fontSize: "0.8rem" }}>
              <th style={{ padding: "12px 16px" }}>Order</th>
              <th style={{ padding: "12px 16px" }}>Customer</th>
              <th style={{ padding: "12px 16px" }}>Restaurant</th>
              <th style={{ padding: "12px 16px" }}>Method</th>
              <th style={{ padding: "12px 16px" }}>Reference</th>
              <th style={{ padding: "12px 16px" }}>Amount</th>
              <th style={{ padding: "12px 16px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((order) => (
              <tr key={order._id} style={{ borderTop: "1px solid var(--gray-100)" }}>
                <td style={{ padding: "12px 16px" }}>
                  <Link to={`/track/${order._id}`}>#{order.orderNumber}</Link>
                  <div style={{ color: "var(--gray-500)", fontSize: "0.8rem" }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                </td>
                <td style={{ padding: "12px 16px" }}>{order.customerName}</td>
                <td style={{ padding: "12px 16px" }}>{order.restaurantName}</td>
                <td style={{ padding: "12px 16px" }}>{order.payment?.method || "—"}</td>
                <td style={{ padding: "12px 16px", fontFamily: "monospace" }}>{order.payment?.transactionId || "—"}</td>
                <td style={{ padding: "12px 16px", fontWeight: 700 }}>₹{order.pricing?.total ?? 0}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span className={`badge ${order.payment?.status === "COMPLETED" ? "badge-success" : "badge-warning"}`}>
                    {order.payment?.status || "PENDING"}
                  </span>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan="7" style={{ padding: "28px", textAlign: "center", color: "var(--gray-500)" }}>No payment records match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
