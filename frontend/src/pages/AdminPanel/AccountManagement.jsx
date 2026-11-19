import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, ShieldCheck, UserCheck, Users } from "lucide-react";
import { api } from "../../services/api";
import { PageFeedback, PageLoading } from "../../components/PageFeedback";

const approvalRole = (role) => role === "restaurant" || role === "rider";

export const AccountManagement = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.admin.getAccounts();
      if (response.success) setAccounts(response.data);
    } catch (requestError) {
      setError(requestError.message || "Unable to load platform accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const updateApproval = async (account) => {
    try {
      setSavingId(account._id);
      setError("");
      setNotice("");
      const response = await api.admin.setAccountApproval(account._id, !account.isApproved);
      if (response.success) {
        setAccounts((current) => current.map((item) =>
          item._id === account._id ? response.data : item
        ));
        setNotice(`${account.name}'s account ${response.data.isApproved ? "was approved" : "approval was revoked"}.`);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to update account approval.");
    } finally {
      setSavingId("");
    }
  };

  const updateAccountStatus = async (account) => {
    try {
      setSavingId(account._id);
      setError("");
      setNotice("");
      const response = await api.admin.setAccountActive(account._id, !account.isActive);
      if (response.success) {
        setAccounts((current) => current.map((item) =>
          item._id === account._id ? response.data : item
        ));
        setNotice(`${account.name}'s account is ${response.data.isActive ? "enabled" : "disabled"}.`);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to update account status.");
    } finally {
      setSavingId("");
    }
  };

  const pendingCount = accounts.filter((account) =>
    approvalRole(account.role) && !account.isApproved
  ).length;
  const visibleAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return accounts.filter((account) => {
      const matchesQuery = !normalizedQuery ||
        [account.name, account.email, account.role, account.phone, account.restaurantName]
          .some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
      const matchesFilter = filter === "all" ||
        (approvalRole(account.role) && !account.isApproved);
      return matchesQuery && matchesFilter;
    });
  }, [accounts, filter, query]);

  if (loading) return <PageLoading label="Loading platform accounts..." />;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "60px" }}>
      <Link to="/admin-panel" className="btn btn-outline btn-sm" style={{ marginBottom: "12px" }}>
        <ArrowLeft size={14} /> Back to Admin Dashboard
      </Link>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "14px", marginBottom: "20px" }}>
        <div>
          <h1>Platform Accounts</h1>
          <p style={{ color: "var(--gray-500)" }}>Review customer, restaurant, and rider accounts; approve restaurant and rider access.</p>
        </div>
        <button onClick={fetchAccounts} className="btn btn-dark btn-sm" disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <PageFeedback message={error} />
      <PageFeedback message={notice} type="success" />

      <div className="responsive-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <div className="card" style={{ padding: "16px" }}>
          <Users size={18} color="var(--primary)" />
          <div>Total accounts</div>
          <strong>{accounts.length}</strong>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <ShieldCheck size={18} color="var(--primary)" />
          <div>Pending approvals</div>
          <strong>{pendingCount}</strong>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <UserCheck size={18} color="var(--primary)" />
          <div>Approved businesses and riders</div>
          <strong>{accounts.filter((account) => approvalRole(account.role) && account.isApproved).length}</strong>
        </div>
      </div>

      <div className="dashboard-controls" style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "12px", marginBottom: "18px" }}>
        <div>
          <label htmlFor="account-search">Search accounts</label>
          <input
            id="account-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, email, role, or phone"
          />
        </div>
        <div>
          <label htmlFor="account-filter">Account filter</label>
          <select id="account-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All accounts</option>
            <option value="pending">Pending approvals</option>
          </select>
        </div>
      </div>

      <div className="responsive-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
        {visibleAccounts.map((account) => (
          <article key={account._id} className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "1.05rem" }}>{account.name}</h2>
                <p style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>{account.email}</p>
              </div>
              <span className="badge badge-success">{account.role}</span>
            </div>
            <div style={{ margin: "14px 0", color: "var(--gray-600)", fontSize: "0.9rem" }}>
              <div>{account.phone || "No phone provided"}</div>
              {account.restaurantName && <div>{account.restaurantName}</div>}
              {account.vehicleDetails && (
                <div>{account.vehicleDetails.type} · {account.vehicleDetails.number}</div>
              )}
              {approvalRole(account.role) && (
                <div style={{ marginTop: "8px" }}>
                  Approval: {account.isApproved ? "Approved" : "Pending"}
                </div>
              )}
              {account.role !== "admin" && (
                <div style={{ marginTop: "8px" }}>
                  Account status: {account.isActive ? "Active" : "Disabled"}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {approvalRole(account.role) && (
              <button
                type="button"
                className={account.isApproved ? "btn btn-outline btn-sm" : "btn btn-primary btn-sm"}
                disabled={savingId === account._id}
                onClick={() => updateApproval(account)}
              >
                {savingId === account._id
                  ? "Updating..."
                  : account.isApproved ? "Revoke approval" : "Approve account"}
              </button>
              )}
              {account.role !== "admin" && (
                <button
                  type="button"
                  className={account.isActive ? "btn btn-outline btn-sm" : "btn btn-primary btn-sm"}
                  disabled={savingId === account._id}
                  onClick={() => updateAccountStatus(account)}
                >
                  {savingId === account._id
                    ? "Updating..."
                    : account.isActive ? "Disable account" : "Enable account"}
                </button>
              )}
            </div>
          </article>
        ))}
        {visibleAccounts.length === 0 && (
          <div className="card" style={{ gridColumn: "1 / -1", padding: "28px", textAlign: "center", color: "var(--gray-500)" }}>
            No accounts match this search and filter.
          </div>
        )}
      </div>
    </div>
  );
};
