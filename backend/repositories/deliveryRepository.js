import { db } from "../models/store.js";
import { clone } from "./clone.js";

export const listDeliveries = () => clone(db.deliveries);

export const findDeliveryByOrderId = (orderId) =>
  clone(db.deliveries.find((delivery) => String(delivery.orderId) === String(orderId)) || null);

export const createDelivery = (delivery) => {
  db.deliveries.push(clone(delivery));
  return clone(delivery);
};

export const updateDeliveryByOrderId = (orderId, updates) => {
  const index = db.deliveries.findIndex((delivery) => String(delivery.orderId) === String(orderId));
  if (index < 0) return null;
  db.deliveries[index] = { ...db.deliveries[index], ...clone(updates) };
  return clone(db.deliveries[index]);
};
