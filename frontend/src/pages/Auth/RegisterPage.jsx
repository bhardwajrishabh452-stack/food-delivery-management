import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { UtensilsCrossed } from "lucide-react";

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "customer",
    restaurantName: "",
    restaurantStreet: "",
    restaurantCity: "",
    vehicleType: "Motorcycle",
    vehicleNumber: "",
    vehicleModel: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const user = await register(formData);
      if (user.role === "restaurant") navigate("/restaurant-panel");
      else if (user.role === "rider") navigate("/delivery-panel");
      else navigate("/");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "520px", margin: "40px auto 80px" }}>
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
            Create an FDS Account
          </h2>
          <p style={{ color: "var(--gray-500)", fontSize: "0.875rem", marginTop: "4px" }}>
            Create an account to order, manage a restaurant, or deliver orders.
          </p>
        </div>

        {error && (
          <div role="alert" style={{ padding: "10px", background: "#fee2e2", color: "#b91c1c", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label htmlFor="account-role" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
              Account type
            </label>
            <select
              id="account-role"
              value={formData.role}
              onChange={(event) => setFormData({ ...formData, role: event.target.value })}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
            >
              <option value="customer">Customer</option>
              <option value="restaurant">Restaurant partner</option>
              <option value="rider">Delivery rider</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
              Full Name
            </label>
            <input
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
            />
          </div>

          {formData.role === "restaurant" && (
            <>
              <div>
                <label htmlFor="restaurant-name" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                  Restaurant / Kitchen Name
                </label>
                <input
                  id="restaurant-name"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. Royal Punjab Dhaba"
                  value={formData.restaurantName}
                  onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                />
              </div>
              <div>
                <label htmlFor="restaurant-street" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                  Street address
                </label>
                <input
                  id="restaurant-street"
                  type="text"
                  required
                  maxLength={160}
                  autoComplete="street-address"
                  value={formData.restaurantStreet}
                  onChange={(e) => setFormData({ ...formData, restaurantStreet: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                />
              </div>
              <div>
                <label htmlFor="restaurant-city" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                  City
                </label>
                <input
                  id="restaurant-city"
                  type="text"
                  required
                  maxLength={80}
                  autoComplete="address-level2"
                  value={formData.restaurantCity}
                  onChange={(e) => setFormData({ ...formData, restaurantCity: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                />
              </div>
            </>
          )}

          {formData.role === "rider" && (
            <>
              <div>
                <label htmlFor="vehicle-type" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                  Vehicle type
                </label>
                <select
                  id="vehicle-type"
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                >
                  <option>Motorcycle</option>
                  <option>Scooter</option>
                  <option>Bicycle</option>
                  <option>Car</option>
                </select>
              </div>
              <div>
                <label htmlFor="vehicle-number" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                  Vehicle registration number
                </label>
                <input
                  id="vehicle-number"
                  type="text"
                  required
                  maxLength={24}
                  autoComplete="off"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                />
              </div>
              <div>
                <label htmlFor="vehicle-model" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                  Vehicle make / model
                </label>
                <input
                  id="vehicle-model"
                  type="text"
                  maxLength={80}
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                />
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
              Email Address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
              Password
            </label>
            <input
              type="password"
              required
              maxLength={72}
              placeholder="At least 8 characters (max 72 bytes)"
              autoComplete="new-password"
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
              Phone Number
            </label>
            <input
              type="tel"
              required={formData.role !== "customer"}
              maxLength={32}
              autoComplete="tel"
              placeholder="+91 98765 00000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: "100%", marginTop: "12px", borderRadius: "10px" }}
          >
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px", fontSize: "0.85rem", color: "var(--gray-500)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--primary)", fontWeight: 700 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
