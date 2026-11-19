import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { LiveMap } from "../../components/LiveMap";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { PageFeedback, PageLoading } from "../../components/PageFeedback";
import {
  Bike,
  Navigation,
  CheckCircle2,
  Power,
  RotateCw
} from "lucide-react";

export const DeliveryDashboard = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(user?.isAvailable !== false);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [riderEarnings, setRiderEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [notice, setNotice] = useState("");
  const [deliverySearch, setDeliverySearch] = useState("");
  const [deliverySort, setDeliverySort] = useState("payout");
  const lastLocationUpdateAt = useRef(0);
  const locationUpdatePending = useRef(false);

  useEffect(() => {
    setIsOnline(user?.isAvailable !== false);
  }, [user?._id, user?.isAvailable]);

  const fetchRiderData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setDashboardError("");
      const [availRes, myRes, earnRes] = await Promise.all([
        api.delivery.getAvailable(),
        api.delivery.getMyDeliveries(),
        api.delivery.getEarnings()
      ]);

      if (availRes.success) setAvailableOrders(availRes.data);
      if (myRes.success) setMyDeliveries(myRes.data);
      if (earnRes.success) setRiderEarnings(earnRes.data);
    } catch (err) {
      setDashboardError(err.message || "Unable to load rider dashboard.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiderData(true);
    const interval = setInterval(() => fetchRiderData(), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptDelivery = async (orderId) => {
    try {
      setActionLoading(true);
      setDashboardError("");
      setNotice("");
      await api.delivery.accept(orderId);
      await fetchRiderData();
      setNotice("Delivery accepted.");
    } catch (err) {
      setDashboardError("Failed to accept delivery: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      setAvailabilityLoading(true);
      setDashboardError("");
      const res = await api.delivery.updateAvailability(!isOnline);
      if (res.success) setIsOnline(res.data.isAvailable);
      await fetchRiderData();
      setNotice(`You are now ${!isOnline ? "online" : "offline"}.`);
    } catch (err) {
      setDashboardError("Unable to update availability: " + err.message);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setActionLoading(true);
      setDashboardError("");
      setNotice("");
      await api.orders.updateStatus(orderId, newStatus);
      await fetchRiderData();
      setNotice("Delivery status updated.");
    } catch (err) {
      setDashboardError("Status update error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStepLocation = async (orderId) => {
    try {
      await api.tracking.simulateStep(orderId);
      await fetchRiderData();
    } catch (err) {
      console.error(err);
    }
  };

  // Find active delivery currently in progress
  const activeDelivery = myDeliveries.find(
    (d) => d.status === "CONFIRMED" || d.status === "READY_FOR_PICKUP" || d.status === "OUT_FOR_DELIVERY"
  );
  const visibleAvailableOrders = availableOrders
    .filter((order) => !deliverySearch.trim() ||
      `${order.orderNumber} ${order.restaurantName}`.toLowerCase().includes(deliverySearch.trim().toLowerCase()))
    .sort((a, b) => deliverySort === "restaurant"
      ? a.restaurantName.localeCompare(b.restaurantName)
      : (b.pricing?.deliveryFee || 0) - (a.pricing?.deliveryFee || 0));

  useEffect(() => {
    if (!sharingLocation) return undefined;
    if (activeDelivery?.status !== "OUT_FOR_DELIVERY") {
      setSharingLocation(false);
      return undefined;
    }
    if (!navigator.geolocation) {
      setLocationError("This browser does not support live location sharing.");
      setSharingLocation(false);
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastLocationUpdateAt.current < 5000 || locationUpdatePending.current) return;

        lastLocationUpdateAt.current = now;
        locationUpdatePending.current = true;
        api.delivery.updateLocation(activeDelivery._id, {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }).then(() => {
          setLocationError("");
          setMyDeliveries((deliveries) => deliveries.map((delivery) =>
            delivery._id === activeDelivery._id
              ? { ...delivery, currentLocation: { lat: position.coords.latitude, lng: position.coords.longitude } }
              : delivery
          ));
        }).catch((error) => {
          setLocationError(error.message || "Unable to update live location.");
          setSharingLocation(false);
        }).finally(() => {
          locationUpdatePending.current = false;
        });
      },
      (error) => {
        setLocationError(error.message || "Location permission is unavailable.");
        setSharingLocation(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [sharingLocation, activeDelivery?._id, activeDelivery?.status]);

  if (loading) return <PageLoading label="Loading rider dashboard..." />;

  return (
    <div style={{ paddingBottom: "60px" }}>
      {/* Header & Status Toggle */}
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
              background: "#ffedd5",
              color: "#ea580c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Bike size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--dark)" }}>
              Delivery Partner Fleet Terminal
            </h1>
            <div style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
              Active Rider: <b>{user?.name || "Delivery partner"}</b>
            </div>
          </div>
        </div>

        <PageFeedback message={dashboardError} />
        <PageFeedback message={notice} type="success" />

        {/* Online / Offline switch */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={handleToggleAvailability}
            disabled={availabilityLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "9999px",
              fontSize: "0.9rem",
              fontWeight: 700,
              background: isOnline ? "#dcfce7" : "#fee2e2",
              color: isOnline ? "#15803d" : "#b91c1c",
              border: isOnline ? "1px solid #86efac" : "1px solid #fca5a5"
            }}
          >
            <Power size={16} />
            <span>
              {availabilityLoading
                ? "Updating..."
                : isOnline ? "Online (Accepting Trips)" : "Offline (Resting)"}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "32px"
        }}
      >
        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Today's Completed Trips
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--dark)", margin: "4px 0" }}>
            {riderEarnings?.todayTripsCompleted || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>
            {riderEarnings?.averageRating ? `Average Rating: ${riderEarnings.averageRating} ★` : "Ratings not available"}
          </div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Today's Trip Earnings
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#15803d", margin: "4px 0" }}>
            ₹{riderEarnings?.todayEarnings || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>From completed deliveries</div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 700, textTransform: "uppercase" }}>
            Weekly Delivery Earnings
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", margin: "4px 0" }}>
            ₹{riderEarnings?.totalEarnings || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>Completed delivery payouts</div>
        </div>
      </div>

      {/* Active Trip in Progress (Hero focus) */}
      {activeDelivery ? (
        <div
          className="card"
          style={{
            padding: "24px",
            marginBottom: "36px",
            border: "2px solid #f97316",
            background: "#fff7ed"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  background: "#f97316",
                  color: "#ffffff",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  textTransform: "uppercase"
                }}
              >
                Active Assigned Delivery
              </span>
              <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                #{activeDelivery.orderNumber}
              </span>
            </div>
            <OrderStatusBadge status={activeDelivery.status} />
          </div>

          <div className="two-column-layout" style={{ gridTemplateColumns: "1.2fr 1fr", gap: "24px", alignItems: "start" }}>
            <div>
              {/* Pickup & Drop Points */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#10b981", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    🏪
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontWeight: 700, textTransform: "uppercase" }}>
                      Pick up from Kitchen
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--dark)" }}>
                      {activeDelivery.restaurantName}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>
                      {activeDelivery.restaurantAddress?.street}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#6366f1", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    🏠
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontWeight: 700, textTransform: "uppercase" }}>
                      Drop to Customer
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--dark)" }}>
                      {activeDelivery.customerName} &bull; {activeDelivery.customerPhone}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>
                      {activeDelivery.deliveryAddress?.street}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step By Step Rider Actions */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {activeDelivery.status === "READY_FOR_PICKUP" && (
                  <button
                    onClick={() => handleUpdateStatus(activeDelivery._id, "OUT_FOR_DELIVERY")}
                    disabled={actionLoading}
                    className="btn btn-secondary btn-lg"
                    style={{ flex: 1, borderRadius: "10px" }}
                  >
                    <CheckCircle2 size={18} /> Confirm Food Picked Up
                  </button>
                )}

                {activeDelivery.status === "OUT_FOR_DELIVERY" && (
                  <>
                    <button
                      onClick={() => {
                        setLocationError("");
                        setSharingLocation(!sharingLocation);
                      }}
                      className={`btn ${sharingLocation ? "btn-secondary" : "btn-dark"}`}
                      style={{ borderRadius: "10px" }}
                    >
                      <Navigation size={14} />
                      {sharingLocation ? "Stop Live Location" : "Share Live Location"}
                    </button>
                    {import.meta.env.DEV && (
                      <button
                        onClick={() => handleStepLocation(activeDelivery._id)}
                        className="btn btn-outline"
                        style={{ borderRadius: "10px" }}
                      >
                        <RotateCw size={14} /> Advance GPS Step
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateStatus(activeDelivery._id, "DELIVERED")}
                      disabled={actionLoading}
                      className="btn btn-primary btn-lg"
                      style={{ flex: 1, borderRadius: "10px" }}
                    >
                      <CheckCircle2 size={18} /> Mark Delivered to Customer
                    </button>
                  </>
                )}

                {locationError && (
                  <div role="alert" style={{ flexBasis: "100%", color: "var(--danger)", fontSize: "0.85rem" }}>
                    {locationError}
                  </div>
                )}

                <Link
                  to={`/track/${activeDelivery._id}`}
                  className="btn btn-outline"
                  style={{ borderRadius: "10px" }}
                >
                  <Navigation size={16} /> Open Turn-By-Turn Map
                </Link>
              </div>
            </div>

            {/* Embedded Live Map */}
            <div style={{ height: "240px", borderRadius: "12px", overflow: "hidden" }}>
              <LiveMap
                restaurantLocation={activeDelivery.restaurantAddress}
                customerLocation={activeDelivery.deliveryAddress}
                riderLocation={activeDelivery.currentLocation}
                height="240px"
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Available Deliveries Queue */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--dark)" }}>
            Nearby Delivery Requests ({availableOrders.length})
          </h2>
          <div className="dashboard-controls" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
            <label htmlFor="delivery-search">Search requests</label>
            <input id="delivery-search" type="search" value={deliverySearch} onChange={(event) => setDeliverySearch(event.target.value)} placeholder="Order or restaurant" />
            <label htmlFor="delivery-sort">Sort by</label>
            <select id="delivery-sort" value={deliverySort} onChange={(event) => setDeliverySort(event.target.value)}>
              <option value="payout">Highest payout</option>
              <option value="restaurant">Restaurant name</option>
            </select>
            <span style={{ fontSize: "0.85rem", color: "var(--gray-500)" }}>
              {isOnline ? "Auto-matching orders in your zone" : "Go Online to accept trips"}
            </span>
          </div>
        </div>

        {visibleAvailableOrders.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--gray-500)" }}>
            <Bike size={36} color="var(--gray-400)" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>No orders waiting for pickup right now</div>
            <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>
              Place an order from the Customer View to test the dispatch assignment engine!
            </div>
          </div>
        ) : (
          <div className="responsive-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
            {visibleAvailableOrders.map((order) => (
              <div key={order._id} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: "1.05rem" }}>#{order.orderNumber}</span>
                    <div style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>{order.restaurantName}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: "#15803d", fontSize: "1.1rem" }}>
                      +₹{order.pricing?.deliveryFee || 40}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--gray-400)" }}>Trip Earning</div>
                  </div>
                </div>

                <div style={{ background: "var(--gray-50)", padding: "10px", borderRadius: "8px", fontSize: "0.8rem", marginBottom: "14px" }}>
                  <div><b>Pickup:</b> {order.restaurantAddress?.street}</div>
                  <div style={{ marginTop: "4px" }}><b>Drop:</b> {order.deliveryAddress?.street}</div>
                </div>

                <div style={{ marginTop: "auto", display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => handleAcceptDelivery(order._id)}
                    disabled={!isOnline || actionLoading}
                    className="btn btn-primary"
                    style={{ flex: 1, borderRadius: "8px" }}
                  >
                    Accept Trip (+₹{order.pricing?.deliveryFee || 40})
                  </button>
                  <Link to={`/track/${order._id}`} className="btn btn-outline btn-sm" style={{ borderRadius: "8px" }}>
                    View Route
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
