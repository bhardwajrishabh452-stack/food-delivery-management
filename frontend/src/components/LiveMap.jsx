import React, { useEffect, useRef } from "react";
import L from "leaflet";

export const LiveMap = ({
  restaurantLocation,
  customerLocation,
  riderLocation,
  waypoints = [],
  restaurantName = "Restaurant",
  customerAddress = "Delivery Location",
  height = "420px"
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({ restaurant: null, customer: null, rider: null, polyline: null });

  const restCoords = [
    restaurantLocation?.lat || 28.6328,
    restaurantLocation?.lng || 77.2197
  ];

  const custCoords = [
    customerLocation?.lat || 28.6139,
    customerLocation?.lng || 77.2090
  ];

  const riderCoords = [
    riderLocation?.lat || (restCoords[0] + custCoords[0]) / 2,
    riderLocation?.lng || (restCoords[1] + custCoords[1]) / 2
  ];

  // Helper icons
  const createCustomIcon = (type, emoji) => {
    return L.divIcon({
      className: "custom-div-icon",
      html: `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: ${type === "restaurant" ? "#10b981" : type === "customer" ? "#6366f1" : "#f97316"};
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          font-size: 20px;
          color: white;
          transform: translate(-50%, -50%);
          ${type === "rider" ? "animation: pulsePin 1.5s infinite;" : ""}
        ">
          ${emoji}
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [0, 0]
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: riderCoords,
        zoom: 13,
        zoomControl: true
      });

      // OpenStreetMap Tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // 1. Restaurant Marker
    if (markersRef.current.restaurant) {
      markersRef.current.restaurant.setLatLng(restCoords);
    } else {
      markersRef.current.restaurant = L.marker(restCoords, {
        icon: createCustomIcon("restaurant", "🏪")
      })
        .addTo(map)
        .bindPopup(`<b>${restaurantName}</b><br>Pickup Kitchen`);
    }

    // 2. Customer Marker
    if (markersRef.current.customer) {
      markersRef.current.customer.setLatLng(custCoords);
    } else {
      markersRef.current.customer = L.marker(custCoords, {
        icon: createCustomIcon("customer", "🏠")
      })
        .addTo(map)
        .bindPopup(`<b>Delivery Address</b><br>${customerAddress}`);
    }

    // 3. Rider Marker
    if (markersRef.current.rider) {
      markersRef.current.rider.setLatLng(riderCoords);
    } else {
      markersRef.current.rider = L.marker(riderCoords, {
        icon: createCustomIcon("rider", "🛵")
      })
        .addTo(map)
        .bindPopup("<b>Delivery Partner</b><br>On the way to destination");
    }

    // 4. Polyline Route
    const polylineCoords =
      waypoints.length > 0
        ? waypoints.map((w) => [w.lat, w.lng])
        : [restCoords, riderCoords, custCoords];

    if (markersRef.current.polyline) {
      markersRef.current.polyline.setLatLngs(polylineCoords);
    } else {
      markersRef.current.polyline = L.polyline(polylineCoords, {
        color: "#f97316",
        weight: 4,
        opacity: 0.8,
        dashArray: "8, 8"
      }).addTo(map);
    }

    // Fit map bounds to show all markers comfortably
    const bounds = L.latLngBounds([restCoords, custCoords, riderCoords]);
    map.fitBounds(bounds, { padding: [40, 40] });

  }, [restaurantLocation, customerLocation, riderLocation, waypoints]);

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: "16px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      {/* Map Legend Overlay */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(4px)",
          padding: "8px 14px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 400,
          fontSize: "12px",
          display: "flex",
          gap: "12px",
          fontWeight: 600
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
          Kitchen
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f97316", display: "inline-block" }}></span>
          Rider (Live)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#6366f1", display: "inline-block" }}></span>
          Customer
        </span>
      </div>
    </div>
  );
};
