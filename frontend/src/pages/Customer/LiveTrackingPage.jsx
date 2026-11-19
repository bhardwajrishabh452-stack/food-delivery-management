import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../services/api";
import { LiveMap } from "../../components/LiveMap";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { PageFeedback, PageLoading } from "../../components/PageFeedback";
import {
  Bike,
  Clock,
  Phone,
  MapPin,
  CheckCircle2,
  Play,
  RotateCw,
  ShoppingBag,
  Sparkles,
  ArrowRight
} from "lucide-react";

export const LiveTrackingPage = () => {
  const { id } = useParams();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [autoDriveActive, setAutoDriveActive] = useState(false);
  const [error, setError] = useState("");

  const fetchTracking = async () => {
    try {
      const res = await api.tracking.get(id);
      if (res.success) {
        setTrackingData(res.data);
        setError("");
      }
    } catch (err) {
      setError(err.message || "Unable to load tracking information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 4000);
    return () => clearInterval(interval);
  }, [id]);

  // Step simulation forward
  const handleSimulateStep = async () => {
    try {
      setSimulating(true);
      setError("");
      const res = await api.tracking.simulateStep(id);
      if (res.success) {
        await fetchTracking();
      }
    } catch (err) {
      setError(err.message || "Unable to simulate rider location.");
    } finally {
      setSimulating(false);
    }
  };

  // Auto drive interval simulation
  useEffect(() => {
    let driveInterval;
    if (autoDriveActive) {
      driveInterval = setInterval(async () => {
        try {
          const res = await api.tracking.simulateStep(id);
          if (res.success) {
            await fetchTracking();
            if (res.data?.isDelivered) {
              setAutoDriveActive(false);
            }
          }
        } catch (err) {
          setError(err.message || "Automatic GPS simulation stopped.");
          setAutoDriveActive(false);
        }
      }, 2500);
    }
    return () => clearInterval(driveInterval);
  }, [autoDriveActive, id]);

  if (loading) return <PageLoading label="Loading order tracking..." />;

  if (!trackingData) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <PageFeedback message={error} />
        <h2>Order not found</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: "16px" }}>
          Back to Explore
        </Link>
      </div>
    );
  }

  const isDelivered = trackingData.status === "DELIVERED";

  return (
    <div style={{ maxWidth: "1140px", margin: "0 auto", paddingBottom: "60px" }}>
      <PageFeedback message={error} />
      {/* Header Info */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "24px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--dark)" }}>
              Live Order Tracking
            </h1>
            <span
              style={{
                background: "var(--gray-100)",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "var(--gray-700)"
              }}
            >
              #{trackingData.orderNumber}
            </span>
          </div>
          <div style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>
            From <b>{trackingData.restaurant?.name}</b> to {trackingData.customer?.address?.street}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <OrderStatusBadge status={trackingData.status} />

          {import.meta.env.DEV && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#ffffff",
                padding: "6px 12px",
                borderRadius: "10px",
                border: "1px solid var(--gray-300)",
                boxShadow: "var(--shadow-sm)"
              }}
            >
              <Sparkles size={16} color="#f97316" />
              <button
                onClick={handleSimulateStep}
                disabled={isDelivered || simulating}
                className="btn btn-sm btn-outline"
                style={{ padding: "4px 10px" }}
              >
                <Play size={12} />
                <span>Simulate Step</span>
              </button>

              <button
                onClick={() => setAutoDriveActive(!autoDriveActive)}
                disabled={isDelivered}
                className={`btn btn-sm ${autoDriveActive ? "btn-secondary" : "btn-primary"}`}
                style={{ padding: "4px 10px" }}
              >
                <RotateCw size={12} className={autoDriveActive ? "spin" : ""} />
                <span>{autoDriveActive ? "Pause Auto-Drive" : "Auto-Drive GPS"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Interactive Map + Delivery Status */}
      <div className="two-column-layout" style={{ gridTemplateColumns: "1.6fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* Left: Map & Route */}
        <div>
          <div className="card" style={{ padding: "12px", marginBottom: "20px" }}>
            <LiveMap
              restaurantLocation={trackingData.restaurant?.address}
              customerLocation={trackingData.customer?.address}
              riderLocation={trackingData.currentLocation}
              waypoints={trackingData.waypoints}
              restaurantName={trackingData.restaurant?.name}
              customerAddress={trackingData.customer?.address?.street}
              height="480px"
            />
          </div>

          {/* Order Lifecycle Milestones */}
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px", color: "var(--dark)" }}>
              Order Lifecycle Progress
            </h3>

            {/* Stepper bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "8px",
                textAlign: "center",
                marginBottom: "24px"
              }}
            >
              {[
                { key: "PLACED", label: "Placed" },
                { key: "CONFIRMED", label: "Kitchen Confirmed" },
                { key: "PREPARING", label: "Cooking" },
                { key: "OUT_FOR_DELIVERY", label: "On The Road" },
                { key: "DELIVERED", label: "Delivered" }
              ].map((step, idx) => {
                const statuses = ["PLACED", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];
                const currentIndex = statuses.indexOf(trackingData.status);
                const isPassed = currentIndex >= idx;
                const isCurrent = currentIndex === idx;

                return (
                  <div key={step.key}>
                    <div
                      style={{
                        height: "6px",
                        borderRadius: "3px",
                        background: isPassed ? "var(--primary)" : "var(--gray-200)",
                        marginBottom: "8px",
                        transition: "all 0.3s"
                      }}
                    />
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: isCurrent ? 800 : 600,
                        color: isPassed ? "var(--dark)" : "var(--gray-400)"
                      }}
                    >
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Timeline Events */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {trackingData.timeline?.map((t, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "var(--primary-light)",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: "2px"
                    }}
                  >
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--dark)" }}>
                      {t.note}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: ETA, Rider Profile & Order Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* ETA Card */}
          <div
            style={{
              background: isDelivered
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              color: "#ffffff",
              padding: "24px",
              borderRadius: "16px",
              boxShadow: "var(--shadow-md)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", opacity: 0.9 }}>
              <Clock size={18} color="#34d399" />
              <span style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase" }}>
                {isDelivered ? "Delivery Completed" : "Estimated Arrival"}
              </span>
            </div>

            <div style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: "4px" }}>
              {isDelivered ? "Delivered! 🎉" : `${trackingData.estimatedDeliveryMinutes} Minutes`}
            </div>

            <div style={{ fontSize: "0.825rem", opacity: 0.8 }}>
              {isDelivered
                ? "Your hot meal has reached your doorstep. Bon appetit!"
                : "Driver is on optimal route according to live GPS traffic."}
            </div>
          </div>

          {/* Rider Profile Card */}
          <div className="card" style={{ padding: "20px" }}>
            <h4 style={{ fontSize: "0.85rem", color: "var(--gray-400)", textTransform: "uppercase", fontWeight: 700, marginBottom: "14px" }}>
              Delivery Partner Assigned
            </h4>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "#ffedd5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ea580c"
                }}
              >
                <Bike size={28} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--dark)" }}>
                  {trackingData.rider?.name}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>
                  {trackingData.rider?.vehicle} &bull; ★ {trackingData.rider?.rating}
                </div>
              </div>

              <a
                href={`tel:${trackingData.rider?.phone}`}
                className="btn btn-primary btn-sm"
                style={{ borderRadius: "8px", padding: "8px 12px" }}
              >
                <Phone size={14} /> Call
              </a>
            </div>

            <div
              style={{
                background: "var(--gray-50)",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                color: "var(--gray-600)",
                display: "flex",
                justifyContent: "space-between"
              }}
            >
              <span>Driver Contact:</span>
              <span style={{ fontWeight: 600 }}>{trackingData.rider?.phone}</span>
            </div>
          </div>

          {/* Order Items Preview */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--dark)" }}>
                Items Ordered
              </h4>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>
                Total ₹{trackingData.pricing?.total}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {trackingData.items?.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                    color: "var(--gray-700)"
                  }}
                >
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
