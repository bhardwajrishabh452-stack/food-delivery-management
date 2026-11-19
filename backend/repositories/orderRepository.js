import { db } from "../models/store.js";
import { clone } from "./clone.js";

export const listOrders = () => clone(db.orders);

export const findOrderById = (id) =>
  clone(db.orders.find((order) => String(order._id) === String(id)) || null);

export const findOrderByIdOrNumber = (id) =>
  clone(db.orders.find(
    (order) => String(order._id) === String(id) || order.orderNumber === id
  ) || null);

export const findOrderByTransactionId = (transactionId) =>
  clone(db.orders.find((order) => order.payment?.transactionId === transactionId) || null);

export const listOrdersByCustomer = (customerId) =>
  clone(db.orders.filter((order) => String(order.customerId) === String(customerId)));

export const listOrdersByRestaurant = (restaurantId) =>
  clone(db.orders.filter((order) => String(order.restaurantId) === String(restaurantId)));

export const listOrdersByRider = (riderId) =>
  clone(db.orders.filter((order) => String(order.riderId) === String(riderId)));

export const createOrder = (order) => {
  db.orders.unshift(clone(order));
  return clone(order);
};

export const updateOrderById = (id, updates) => {
  const index = db.orders.findIndex((order) => String(order._id) === String(id));
  if (index < 0) return null;
  db.orders[index] = clone(updates);
  return clone(db.orders[index]);
};
