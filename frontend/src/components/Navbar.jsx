import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import {
  UtensilsCrossed,
  ShoppingBag,
  MapPin,
  Clock,
  Compass,
  ChefHat,
  Bike,
  ShieldCheck,
  User,
  LogOut
} from "lucide-react";

export const Navbar = () => {
  const { user, role, logout } = useAuth();
  const { itemCount } = useCart();
  const homePath = role === "restaurant"
    ? "/restaurant-panel"
    : role === "rider"
      ? "/delivery-panel"
      : role === "admin"
        ? "/admin-panel"
        : "/";
  const showCustomerLinks = !user || role === "customer";

  return (
    <header
      style={{
        background: "#ffffff",
        borderBottom: "1px solid var(--gray-200)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
      }}
    >
      <div
        className="site-header-inner"
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px"
        }}
      >
        {/* Brand Logo & Location */}
        <div className="site-brand-group" style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Link
            to={homePath}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 800,
              fontSize: "1.35rem",
              color: "var(--dark)"
            }}
          >
            <div
              className="site-location"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white"
              }}
            >
              <UtensilsCrossed size={20} />
            </div>
            <span>
              FDS<span style={{ color: "var(--primary)" }}>.Delivery</span>
            </span>
          </Link>

          {/* Delivery Location Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              background: "var(--gray-100)",
              borderRadius: "9999px",
              fontSize: "0.85rem",
              color: "var(--gray-700)"
            }}
          >
            <MapPin size={16} color="#10b981" />
            <span style={{ fontWeight: 600 }}>Connaught Place, New Delhi</span>
          </div>
        </div>

        {/* Center / Role Navigation Links */}
        <nav className="site-nav" aria-label="Main navigation" style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          {showCustomerLinks && (
            <>
              <Link
                to="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.925rem",
                  fontWeight: 600,
                  color: "var(--gray-700)"
                }}
              >
                <Compass size={18} />
                <span>Explore</span>
              </Link>

              {user && (
                <Link
                  to="/my-orders"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.925rem",
                    fontWeight: 600,
                    color: "var(--gray-700)"
                  }}
                >
                  <Clock size={18} />
                  <span>Orders</span>
                </Link>
              )}
            </>
          )}

          {/* Role Panels Shortcuts */}
          {role === "restaurant" && (
            <Link
              to="/restaurant-panel"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.925rem",
                fontWeight: 600,
                color: "#f59e0b"
              }}
            >
              <ChefHat size={18} />
              <span>Kitchen Queue</span>
            </Link>
          )}

          {role === "rider" && (
            <Link
              to="/delivery-panel"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.925rem",
                fontWeight: 600,
                color: "#f97316"
              }}
            >
              <Bike size={18} />
              <span>Rider Deliveries</span>
            </Link>
          )}

          {role === "admin" && (
            <Link
              to="/admin-panel"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.925rem",
                fontWeight: 600,
                color: "#6366f1"
              }}
            >
              <ShieldCheck size={18} />
              <span>Admin & Settlements</span>
            </Link>
          )}
        </nav>

        {/* Right Actions: Cart & Profile */}
        <div className="site-actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Cart Pill */}
          {showCustomerLinks && (
            <Link
              to="/cart"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "9999px",
                background: itemCount > 0 ? "var(--primary)" : "var(--gray-100)",
                color: itemCount > 0 ? "#ffffff" : "var(--gray-700)",
                fontWeight: 700,
                fontSize: "0.9rem",
                transition: "all 0.2s"
              }}
            >
              <ShoppingBag size={18} />
              <span>Cart</span>
              {itemCount > 0 && (
                <span
                  style={{
                    background: "#ffffff",
                    color: "var(--primary)",
                    borderRadius: "9999px",
                    padding: "1px 7px",
                    fontSize: "0.78rem"
                  }}
                >
                  {itemCount}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "var(--gray-50)",
                border: "1px solid var(--gray-200)",
                fontSize: "0.85rem"
              }}
            >
              <User size={16} color="var(--gray-600)" />
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600 }}>{user.name}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--gray-500)", textTransform: "capitalize" }}>
                  {user.role}
                </div>
              </div>
              <button
                onClick={logout}
                title="Logout"
                style={{ background: "transparent", color: "var(--gray-400)", marginLeft: "4px" }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link to="/login" style={{ fontWeight: 700, color: "var(--gray-700)", fontSize: "0.9rem" }}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: "8px 14px", borderRadius: "9999px" }}>
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
