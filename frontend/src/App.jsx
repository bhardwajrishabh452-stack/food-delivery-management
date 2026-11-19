import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { PageLoading } from "./components/PageFeedback";

// Pages
import { HomePage } from "./pages/Customer/HomePage";
import { RestaurantDetailPage } from "./pages/Customer/RestaurantDetailPage";
import { CartPage } from "./pages/Customer/CartPage";
import { CheckoutPage } from "./pages/Customer/CheckoutPage";
import { LiveTrackingPage } from "./pages/Customer/LiveTrackingPage";
import { MyOrdersPage } from "./pages/Customer/MyOrdersPage";

// Restaurant Panel
import { RestaurantDashboard } from "./pages/RestaurantPanel/RestaurantDashboard";
import { MenuManagement } from "./pages/RestaurantPanel/MenuManagement";
import { RestaurantEarnings } from "./pages/RestaurantPanel/RestaurantEarnings";

// Delivery Panel
import { DeliveryDashboard } from "./pages/DeliveryPanel/DeliveryDashboard";

// Admin Panel
import { AdminDashboard } from "./pages/AdminPanel/AdminDashboard";
import { SettlementsDashboard } from "./pages/AdminPanel/SettlementsDashboard";
import { CouponManagement } from "./pages/AdminPanel/CouponManagement";
import { RestaurantOperations } from "./pages/AdminPanel/RestaurantOperations";
import { PaymentsDashboard } from "./pages/AdminPanel/PaymentsDashboard";
import { AccountManagement } from "./pages/AdminPanel/AccountManagement";

// Auth
import { LoginPage } from "./pages/Auth/LoginPage";
import { RegisterPage } from "./pages/Auth/RegisterPage";

const RoleGate = ({ roles, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;

  if (loading) return <PageLoading label="Checking account access..." />;

  if (!user) {
    return (
      <div className="card" style={{ maxWidth: "640px", margin: "48px auto", padding: "28px", textAlign: "center" }}>
        <h1>Sign in required</h1>
        <p style={{ color: "var(--gray-500)", margin: "12px 0 20px" }}>Create an account or sign in to access this view.</p>
        <Link to="/login" state={{ from: returnTo }} className="btn btn-primary">Sign In</Link>
        <Link to="/register" style={{ display: "inline-block", marginLeft: "12px", color: "var(--primary)", fontWeight: 700 }}>
          Create Account
        </Link>
      </div>
    );
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="card" style={{ maxWidth: "640px", margin: "48px auto", padding: "28px", textAlign: "center" }}>
        <h1>Dashboard access restricted</h1>
        <p style={{ color: "var(--gray-500)", margin: "12px 0 20px" }}>
          This view is available to {roles.join(" or ")} accounts.
        </p>
        <Link to="/" className="btn btn-primary">Return to Explore</Link>
      </div>
    );
  }

  if (
    ["restaurant", "rider"].includes(user.role) &&
    user.isApproved === false
  ) {
    return (
      <div className="card" style={{ maxWidth: "640px", margin: "48px auto", padding: "28px", textAlign: "center" }}>
        <h1>Account pending approval</h1>
        <p style={{ color: "var(--gray-500)", margin: "12px 0 20px" }}>
          Your {user.role === "restaurant" ? "restaurant" : "delivery rider"} account is awaiting platform administrator approval.
        </p>
        <Link to="/" className="btn btn-primary">Return to Explore</Link>
      </div>
    );
  }

  return children;
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <div className="app-container">
            {/* Main Navigation */}
            <Navbar />

            {/* Viewport content */}
            <main className="main-content">
              <Routes>
                {/* Customer Endpoints */}
                <Route path="/" element={<HomePage />} />
                <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
                <Route path="/cart" element={<RoleGate roles={["customer"]}><CartPage /></RoleGate>} />
                <Route path="/checkout" element={<RoleGate roles={["customer"]}><CheckoutPage /></RoleGate>} />
                <Route path="/track/:id" element={<RoleGate roles={["customer", "restaurant", "rider", "admin"]}><LiveTrackingPage /></RoleGate>} />
                <Route path="/my-orders" element={<RoleGate roles={["customer"]}><MyOrdersPage /></RoleGate>} />

                {/* Restaurant Panel */}
                <Route path="/restaurant-panel" element={<RoleGate roles={["restaurant"]}><RestaurantDashboard /></RoleGate>} />
                <Route path="/restaurant-panel/menu" element={<RoleGate roles={["restaurant"]}><MenuManagement /></RoleGate>} />
                <Route path="/restaurant-panel/earnings" element={<RoleGate roles={["restaurant"]}><RestaurantEarnings /></RoleGate>} />

                {/* Delivery Panel */}
                <Route path="/delivery-panel" element={<RoleGate roles={["rider"]}><DeliveryDashboard /></RoleGate>} />

                {/* Admin Management & Settlements */}
                <Route path="/admin-panel" element={<RoleGate roles={["admin"]}><AdminDashboard /></RoleGate>} />
                <Route path="/admin-panel/accounts" element={<RoleGate roles={["admin"]}><AccountManagement /></RoleGate>} />
                <Route path="/admin-panel/restaurants" element={<RoleGate roles={["admin"]}><RestaurantOperations /></RoleGate>} />
                <Route path="/admin-panel/menus" element={<RoleGate roles={["admin"]}><MenuManagement /></RoleGate>} />
                <Route path="/admin-panel/payments" element={<RoleGate roles={["admin"]}><PaymentsDashboard /></RoleGate>} />
                <Route path="/admin-panel/settlements" element={<RoleGate roles={["admin"]}><SettlementsDashboard /></RoleGate>} />
                <Route path="/admin-panel/coupons" element={<RoleGate roles={["admin"]}><CouponManagement /></RoleGate>} />

                {/* Authentication */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Footer */}
            <Footer />
          </div>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}
