import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { PageFeedback, PageLoading } from "../../components/PageFeedback";
import {
  Tag,
  Plus,
  ArrowLeft
} from "lucide-react";

export const CouponManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("code");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [newCoupon, setNewCoupon] = useState({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: 25,
    minOrderAmount: 200,
    maxDiscountAmount: 150
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.coupons.getActive();
      if (res.success) {
        setCoupons(res.data);
      }
    } catch (err) {
      setError(err.message || "Unable to load coupons.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError("");
      setNotice("");
      const res = await api.coupons.create(newCoupon);
      if (res.success) {
        setCoupons((currentCoupons) => [...currentCoupons, res.data]);
        setShowAddModal(false);
        setNewCoupon({
          code: "",
          description: "",
          discountType: "percentage",
          discountValue: 25,
          minOrderAmount: 200,
          maxDiscountAmount: 150
        });
        setNotice("Coupon created and published.");
      }
    } catch (err) {
      setError("Failed to create coupon: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const query = search.trim().toLowerCase();
  const visibleCoupons = coupons
    .filter((coupon) => {
      const expired = coupon.validUntil && new Date(coupon.validUntil) < new Date();
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "expired" ? expired : !expired);
      const matchesSearch = !query ||
        coupon.code.toLowerCase().includes(query) ||
        (coupon.description || "").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => sortBy === "usage"
      ? (b.usageCount || 0) - (a.usageCount || 0)
      : a.code.localeCompare(b.code));
  const totalUses = coupons.reduce((sum, coupon) => sum + (coupon.usageCount || 0), 0);
  const expiredCount = coupons.filter((coupon) =>
    coupon.validUntil && new Date(coupon.validUntil) < new Date()
  ).length;

  if (loading) return <PageLoading label="Loading coupons..." />;

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto", paddingBottom: "60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <Link
            to="/admin-panel"
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
            <ArrowLeft size={16} /> Back to Admin Terminal
          </Link>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--dark)" }}>
            Promotion &amp; Discount Coupons
          </h1>
          <div style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
            Configure promotional marketing codes, discount caps, and minimum basket requirements.
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          disabled={creating}
          className="btn btn-primary"
          style={{ borderRadius: "10px" }}
        >
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      <PageFeedback message={error} />
      <PageFeedback message={notice} type="success" />

      <div className="responsive-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <button type="button" className="card" aria-pressed={statusFilter === "all"} onClick={() => setStatusFilter("all")} style={{ padding: "16px", textAlign: "left" }}>Published records <strong>{coupons.length}</strong></button>
        <button type="button" className="card" aria-pressed={statusFilter === "valid"} onClick={() => setStatusFilter("valid")} style={{ padding: "16px", textAlign: "left" }}>Currently valid <strong>{coupons.length - expiredCount}</strong></button>
        <button type="button" className="card" aria-pressed={statusFilter === "expired"} onClick={() => setStatusFilter("expired")} style={{ padding: "16px", textAlign: "left" }}>Expired <strong>{expiredCount}</strong></button>
        <div className="card" style={{ padding: "16px" }}>Total redemptions <strong>{totalUses}</strong></div>
      </div>

      <div className="dashboard-controls" style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "12px", marginBottom: "16px" }}>
        <div>
          <label htmlFor="coupon-search">Search coupons</label>
          <input id="coupon-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Code or description" />
        </div>
        <div>
          <label htmlFor="coupon-sort">Sort by</label>
          <select id="coupon-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="code">Code</option>
            <option value="usage">Most used</option>
          </select>
        </div>
        <div>
          <label htmlFor="coupon-status">Validity</label>
          <select id="coupon-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All records</option>
            <option value="valid">Currently valid</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <div className="card responsive-table">
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "var(--gray-50)", borderBottom: "1px solid var(--gray-200)", fontSize: "0.8rem", color: "var(--gray-500)", textTransform: "uppercase" }}>
              <th style={{ padding: "14px 20px" }}>Promo Code</th>
              <th style={{ padding: "14px 20px" }}>Benefit</th>
              <th style={{ padding: "14px 20px" }}>Min Basket</th>
              <th style={{ padding: "14px 20px" }}>Max Cap</th>
              <th style={{ padding: "14px 20px" }}>Usage Count</th>
              <th style={{ padding: "14px 20px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleCoupons.map((c) => (
              <tr key={c._id} style={{ borderBottom: "1px solid var(--gray-100)", fontSize: "0.875rem" }}>
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ display: "inline-block", background: "var(--primary-light)", color: "var(--primary-hover)", fontWeight: 800, padding: "4px 10px", borderRadius: "6px", letterSpacing: "0.5px" }}>
                    {c.code}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--gray-400)", marginTop: "4px" }}>
                    {c.description}
                  </div>
                </td>
                <td style={{ padding: "14px 20px", fontWeight: 700 }}>
                  {c.discountValue}{c.discountType === "percentage" ? "% OFF" : "₹ FLAT"}
                </td>
                <td style={{ padding: "14px 20px", color: "var(--gray-600)" }}>
                  ₹{c.minOrderAmount}
                </td>
                <td style={{ padding: "14px 20px", color: "var(--gray-600)" }}>
                  ₹{c.maxDiscountAmount || "No Cap"}
                </td>
                <td style={{ padding: "14px 20px", fontWeight: 700 }}>
                  {c.usageCount || 0} times
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <span className={`badge ${c.validUntil && new Date(c.validUntil) < new Date() ? "badge-warning" : "badge-success"}`}>
                    {c.validUntil && new Date(c.validUntil) < new Date() ? "Expired" : "Valid"}
                  </span>
                </td>
              </tr>
            ))}
            {visibleCoupons.length === 0 && (
              <tr><td colSpan="6" style={{ padding: "28px", textAlign: "center", color: "var(--gray-500)" }}>No coupons match this search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Coupon Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: "28px" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px", color: "var(--dark)" }}>
              Create New Promotion Code
            </h3>
            <PageFeedback message={error} />

            <form onSubmit={handleCreateCoupon} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label htmlFor="coupon-code" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                  Coupon Code
                </label>
                <input
                  type="text"
                  id="coupon-code"
                  required
                  maxLength="40"
                  placeholder="e.g. FESTIVE40"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--gray-300)", textTransform: "uppercase", fontWeight: 700 }}
                />
              </div>

              <div>
                <label htmlFor="coupon-description" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                  Description
                </label>
                <input
                  type="text"
                  id="coupon-description"
                  maxLength="120"
                  placeholder="e.g. 40% OFF on weekend feasts"
                  value={newCoupon.description}
                  onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label htmlFor="coupon-discount-type" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                    Discount Type
                  </label>
                  <select
                    id="coupon-discount-type"
                    value={newCoupon.discountType}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="coupon-discount-value" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                    Discount Value
                  </label>
                  <input
                    type="number"
                    id="coupon-discount-value"
                    required
                    min="1"
                    max={newCoupon.discountType === "percentage" ? "100" : undefined}
                    step="0.01"
                    value={newCoupon.discountValue}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label htmlFor="coupon-minimum" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                    Min Order Value (₹)
                  </label>
                  <input
                    type="number"
                    id="coupon-minimum"
                    min="0"
                    step="0.01"
                    value={newCoupon.minOrderAmount}
                    onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: Number(e.target.value) })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                  />
                </div>

                <div>
                  <label htmlFor="coupon-max-discount" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    id="coupon-max-discount"
                    min="0"
                    step="0.01"
                    value={newCoupon.maxDiscountAmount}
                    onChange={(e) => setNewCoupon({ ...newCoupon, maxDiscountAmount: Number(e.target.value) })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? "Publishing..." : "Publish Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
