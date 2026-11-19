import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { UtensilsCrossed, Lock, Mail } from "lucide-react";

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleManualLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const user = await login(email, password);
      const returnTo = location.state?.from;
      const isCustomerDestination = user.role === "customer" &&
        typeof returnTo === "string" &&
        (["/cart", "/checkout", "/my-orders"].includes(returnTo) || returnTo.startsWith("/restaurant/"));
      if (isCustomerDestination) navigate(returnTo);
      else if (user.role === "restaurant") navigate("/restaurant-panel");
      else if (user.role === "rider") navigate("/delivery-panel");
      else if (user.role === "admin") navigate("/admin-panel");
      else navigate("/");
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "480px", margin: "40px auto 80px" }}>
      <div className="card" style={{ padding: "36px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px"
            }}
          >
            <UtensilsCrossed size={28} />
          </div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--dark)" }}>
            Sign in to FDS
          </h2>
          <p style={{ color: "var(--gray-500)", fontSize: "0.875rem", marginTop: "4px" }}>
            Sign in to your customer, restaurant, rider, or administrator account.
          </p>
        </div>

        {error && (
          <div role="alert" style={{ padding: "10px", background: "#fee2e2", color: "#b91c1c", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleManualLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "6px" }}>
              Email Address
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", border: "1px solid var(--gray-300)", borderRadius: "8px", padding: "10px 14px" }}>
              <Mail size={16} color="var(--gray-400)" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ border: "none", width: "100%", fontSize: "0.9rem" }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "6px" }}>
              Password
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", border: "1px solid var(--gray-300)", borderRadius: "8px", padding: "10px 14px" }}>
              <Lock size={16} color="var(--gray-400)" />
              <input
                type="password"
                required
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ border: "none", width: "100%", fontSize: "0.9rem" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: "100%", marginTop: "8px", borderRadius: "10px" }}
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px", fontSize: "0.85rem", color: "var(--gray-500)" }}>
          New customer, restaurant, or rider?{" "}
          <Link to="/register" style={{ color: "var(--primary)", fontWeight: 700 }}>
            Create an account
          </Link>
        </div>
        <p style={{ textAlign: "center", marginTop: "12px", color: "var(--gray-500)", fontSize: "0.78rem" }}>
          Administrator accounts are provisioned securely by the platform owner.
        </p>
      </div>
    </div>
  );
};
