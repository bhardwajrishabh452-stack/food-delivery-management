import { db } from "../models/store.js";
import { clone } from "./clone.js";

export const listRestaurants = () => clone(db.restaurants);

export const isRestaurantApproved = (restaurant) =>
  Boolean(
    restaurant &&
    (
      restaurant.isApproved === true ||
      (
        restaurant.isApproved === undefined &&
        (restaurant.ownerId === null || restaurant.ownerId === undefined)
      )
    )
  );

export const findRestaurantById = (id) =>
  clone(db.restaurants.find((restaurant) => String(restaurant._id) === String(id)) || null);

export const findRestaurantByOwnerId = (ownerId) =>
  clone(db.restaurants.find((restaurant) => String(restaurant.ownerId) === String(ownerId)) || null);

export const createRestaurant = (restaurant) => {
  db.restaurants.push(clone(restaurant));
  return clone(restaurant);
};

export const updateRestaurantById = (id, updates) => {
  const index = db.restaurants.findIndex((restaurant) => String(restaurant._id) === String(id));
  if (index < 0) return null;
  db.restaurants[index] = { ...db.restaurants[index], ...clone(updates) };
  return clone(db.restaurants[index]);
};
