import React from "react";
import { UtensilsCrossed } from "lucide-react";

export const Footer = () => {
  return (
    <footer
      style={{
        background: "#0f172a",
        color: "#94a3b8",
        padding: "36px 16px 24px",
        marginTop: "auto",
        borderTop: "1px solid #1e293b",
        fontSize: "0.875rem"
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white"
            }}
          >
            <UtensilsCrossed size={18} />
          </div>
          <div>
            <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "1rem" }}>
              Food Delivery System (FDS)
            </div>
            <div style={{ fontSize: "0.78rem" }}>
              Enterprise Platform: Ordering &bull; Geo-Tracking &bull; Dispatch &bull; Settlements
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "0.8rem" }}>
          <span>Prototype only: no real payments or bank settlements</span>
          <span>&bull;</span>
          <span>Dual Database Engine (MongoDB + Active Store)</span>
        </div>

        <div style={{ fontSize: "0.8rem" }}>
          Built with React &bull; Node.js &bull; Express &bull; MongoDB &bull; Leaflet Maps
        </div>
      </div>
    </footer>
  );
};
