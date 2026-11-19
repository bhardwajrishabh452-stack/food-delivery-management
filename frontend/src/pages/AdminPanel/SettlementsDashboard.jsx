import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { PageFeedback, PageLoading } from "../../components/PageFeedback";
import {
  DollarSign,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";

export const SettlementsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRest, setSelectedRest] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [ledgerSearch, setLedgerSearch] = useState("");

  const fetchSettlements = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError("");
      const res = await api.settlements.getOverview();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || "Unable to load settlement data.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const handleOpenPayoutModal = (rest) => {
    setSelectedRest(rest);
    setPayoutAmount(rest.netPayable > 0 ? rest.netPayable : 5000);
    setSuccessMessage("");
  };

  const handleDisbursePayout = async (e) => {
    e.preventDefault();
    try {
      setProcessing(true);
      setError("");
      const res = await api.settlements.process({
        entityType: "restaurant",
        entityId: selectedRest.restaurantId,
        amount: Number(payoutAmount),
        notes: `Weekly vendor settlement for ${selectedRest.restaurantName}`
      });
      if (res.success) {
        setSuccessMessage(res.message);
        await fetchSettlements(false);
        setTimeout(() => setSelectedRest(null), 1800);
      }
    } catch (err) {
      setError("Settlement record failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <PageLoading label="Loading settlement dashboard..." />;

  const summary = data?.summary || {};
  const query = search.trim().toLowerCase();
  const restaurants = (data?.restaurants || [])
    .filter((restaurant) => !query || restaurant.restaurantName.toLowerCase().includes(query))
    .sort((a, b) => b.netPayable - a.netPayable);
  const ledgerQuery = ledgerSearch.trim().toLowerCase();
  const ledger = (data?.settlementsLedger || [])
    .filter((entry) => !ledgerQuery ||
      `${entry.entityName} ${entry.payoutReference}`.toLowerCase().includes(ledgerQuery))
    .sort((a, b) => new Date(b.settledAt) - new Date(a.settledAt));

  return (
    <div style={{ maxWidth: "1140px", margin: "0 auto", paddingBottom: "60px" }}>
      <PageFeedback message={error} />
      <div style={{ marginBottom: "28px" }}>
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
          FDS Commission Engine &amp; Vendor Settlements
        </h1>
        <div style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
          Commission calculations and simulated settlement records. This prototype does not initiate bank transfers.
        </div>
      </div>

      {/* Financial Health Summary */}
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
            Total Platform Commission
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#15803d", margin: "4px 0" }}>
            ₹{summary.totalPlatformCommission || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>Net platform income</div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Vendor Payouts Pending
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#d97706", margin: "4px 0" }}>
            ₹{summary.pendingPayouts || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>Due for current settlement cycle</div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Total Settled Payout Records
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--dark)", margin: "4px 0" }}>
            ₹{summary.settledPayouts || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>Recorded as settled in this prototype</div>
        </div>
      </div>

      {/* Restaurant Commission Breakdown Table */}
      <div className="card" style={{ padding: "24px", marginBottom: "32px" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--dark)", marginBottom: "16px" }}>
          Restaurant Vendor Commission Split
        </h3>

        <div className="dashboard-controls" style={{ marginBottom: "16px" }}>
          <label htmlFor="settlement-restaurant-search">Search restaurants</label>
          <input id="settlement-restaurant-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Restaurant name" />
          <span style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>Sorted by highest outstanding balance</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--gray-50)", borderBottom: "1px solid var(--gray-200)", fontSize: "0.8rem", color: "var(--gray-500)", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 16px" }}>Restaurant</th>
                <th style={{ padding: "12px 16px" }}>Orders</th>
                <th style={{ padding: "12px 16px" }}>Food Subtotal</th>
                <th style={{ padding: "12px 16px" }}>Commission (15%)</th>
                <th style={{ padding: "12px 16px" }}>Tax on Orders</th>
                <th style={{ padding: "12px 16px" }}>Net Payable</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Payout Action</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.restaurantId} style={{ borderBottom: "1px solid var(--gray-100)", fontSize: "0.875rem" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: "var(--dark)" }}>
                    {r.restaurantName}
                  </td>
                  <td style={{ padding: "14px 16px" }}>{r.ordersCount}</td>
                  <td style={{ padding: "14px 16px" }}>₹{r.subtotal}</td>
                  <td style={{ padding: "14px 16px", color: "var(--danger)", fontWeight: 600 }}>
                    - ₹{r.commission}
                  </td>
                  <td style={{ padding: "14px 16px" }}>+ ₹{r.tax}</td>
                  <td style={{ padding: "14px 16px", fontWeight: 800, color: "#15803d", fontSize: "0.95rem" }}>
                    ₹{r.netPayable}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => handleOpenPayoutModal(r)}
                      disabled={r.netPayable <= 0}
                      className="btn btn-primary btn-sm"
                      style={{
                        borderRadius: "8px",
                        padding: "6px 12px",
                        opacity: r.netPayable <= 0 ? 0.5 : 1,
                        cursor: r.netPayable <= 0 ? "not-allowed" : "pointer"
                      }}
                    >
                      <DollarSign size={14} /> {r.netPayable <= 0 ? "No Payout Due" : "Record Settlement"}
                    </button>
                  </td>
                </tr>
              ))}
              {restaurants.length === 0 && (
                <tr><td colSpan="7" style={{ padding: "28px", textAlign: "center", color: "var(--gray-500)" }}>No restaurants match this search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settlement history ledger */}
      <div className="card" style={{ padding: "24px" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--dark)", marginBottom: "16px" }}>
          Historical Settlement Records
        </h3>

        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="settlement-ledger-search">Search settlement records</label>
          <input id="settlement-ledger-search" type="search" value={ledgerSearch} onChange={(event) => setLedgerSearch(event.target.value)} placeholder="Restaurant or reference" />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--gray-50)", borderBottom: "1px solid var(--gray-200)", fontSize: "0.8rem", color: "var(--gray-500)", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 16px" }}>Vendor Partner</th>
                <th style={{ padding: "12px 16px" }}>Cycle Period</th>
                <th style={{ padding: "12px 16px" }}>Payout Amount</th>
                <th style={{ padding: "12px 16px" }}>Settlement Reference</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Settled At</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((s) => (
                <tr key={s._id} style={{ borderBottom: "1px solid var(--gray-100)", fontSize: "0.875rem" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--dark)" }}>
                    {s.entityName}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--gray-600)" }}>
                    {s.periodStart} &bull; {s.periodEnd}
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 800, color: "#15803d" }}>
                    ₹{s.payoutAmount}
                  </td>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {s.payoutReference}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className="badge badge-success">Settled</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--gray-400)", fontSize: "0.8rem" }}>
                    {new Date(s.settledAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr><td colSpan="6" style={{ padding: "28px", textAlign: "center", color: "var(--gray-500)" }}>No settlement records match this search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record settlement modal */}
      {selectedRest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: "28px" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "8px", color: "var(--dark)" }}>
              Record Vendor Settlement
            </h3>
            <p style={{ color: "var(--gray-500)", fontSize: "0.85rem", marginBottom: "18px" }}>
              Recipient: <b>{selectedRest.restaurantName}</b>
            </p>

            {successMessage ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#15803d" }}>
                <CheckCircle2 size={48} style={{ margin: "0 auto 12px" }} />
                <h4 style={{ fontSize: "1.15rem", fontWeight: 800 }}>Settlement Record Created</h4>
                <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>{successMessage}</div>
              </div>
            ) : (
              <form onSubmit={handleDisbursePayout} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <PageFeedback message={error} />
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                    Payout Record Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    readOnly
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--gray-300)", fontSize: "1rem", fontWeight: 700 }}
                  />
                </div>

                <div style={{ background: "var(--gray-50)", padding: "12px", borderRadius: "8px", fontSize: "0.85rem" }}>
                  <div style={{ color: "var(--gray-400)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>
                    Payout Account (masked):
                  </div>
                  <div style={{ fontWeight: 700, color: "var(--dark)" }}>
                    {selectedRest.bankDetails?.bankName || "Bank details not provided"}
                    {selectedRest.bankDetails?.accountLast4 ? ` ****${selectedRest.bankDetails.accountLast4}` : ""}
                  </div>
                  <div style={{ color: "var(--gray-500)", fontSize: "0.8rem" }}>
                    IFSC: {selectedRest.bankDetails?.ifsc || "Not provided"}
                  </div>
                </div>

                <div style={{ color: "var(--gray-500)", fontSize: "0.8rem" }}>
                  This creates a settlement record only; no bank transfer is initiated.
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedRest(null)}
                    disabled={processing}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="btn btn-primary"
                  >
                    {processing ? "Recording..." : `Record Settlement of ₹${payoutAmount}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
