import { db } from "../models/store.js";
import { clone } from "./clone.js";

export const listMenuItems = () => clone(db.menuItems);

export const listVegetarianRestaurantIds = () =>
  [...new Set(db.menuItems.filter((item) => item.isVeg).map((item) => String(item.restaurantId)))];

export const listMenuItemsByRestaurant = (restaurantId) =>
  clone(db.menuItems.filter((item) => String(item.restaurantId) === String(restaurantId)));

export const findMenuItemById = (id) =>
  clone(db.menuItems.find((item) => String(item._id) === String(id)) || null);

export const findMenuItemForRestaurant = (id, restaurantId) =>
  clone(db.menuItems.find(
    (item) => String(item._id) === String(id) && String(item.restaurantId) === String(restaurantId)
  ) || null);

export const createMenuItem = (item) => {
  db.menuItems.push(clone(item));
  return clone(item);
};

export const updateMenuItemById = (id, updates) => {
  const index = db.menuItems.findIndex((item) => String(item._id) === String(id));
  if (index < 0) return null;
  db.menuItems[index] = { ...db.menuItems[index], ...clone(updates) };
  return clone(db.menuItems[index]);
};

export const deleteMenuItemById = (id) => {
  const index = db.menuItems.findIndex((item) => String(item._id) === String(id));
  return index < 0 ? null : clone(db.menuItems.splice(index, 1)[0]);
};
