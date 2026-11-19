import React from "react";
import { Clock, CheckCircle2, ChefHat, Package, Bike, XCircle } from "lucide-react";

export const OrderStatusBadge = ({ status }) => {
  const configs = {
    PLACED: {
      label: "Order Placed",
      bg: "#fef3c7",
      color: "#b45309",
      icon: Clock
    },
    CONFIRMED: {
      label: "Confirmed",
      bg: "#e0e7ff",
      color: "#4338ca",
      icon: CheckCircle2
    },
    PREPARING: {
      label: "In Kitchen",
      bg: "#fef08a",
      color: "#854d0e",
      icon: ChefHat
    },
    READY_FOR_PICKUP: {
      label: "Ready for Pickup",
      bg: "#fed7aa",
      color: "#c2410c",
      icon: Package
    },
    OUT_FOR_DELIVERY: {
      label: "Out for Delivery",
      bg: "#ffedd5",
      color: "#ea580c",
      icon: Bike
    },
    DELIVERED: {
      label: "Delivered",
      bg: "#dcfce7",
      color: "#15803d",
      icon: CheckCircle2
    },
    CANCELLED: {
      label: "Cancelled",
      bg: "#fee2e2",
      color: "#b91c1c",
      icon: XCircle
    }
  };

  const current = configs[status] || configs.PLACED;
  const IconComponent = current.icon;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        borderRadius: "9999px",
        fontSize: "0.785rem",
        fontWeight: 700,
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.color}30`
      }}
    >
      <IconComponent size={14} />
      {current.label}
    </span>
  );
};
