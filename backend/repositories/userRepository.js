import { db } from "../models/store.js";
import { clone } from "./clone.js";

export const listUsers = () => clone(db.users);

export const findUserById = (id) =>
  clone(db.users.find((user) => String(user._id) === String(id)) || null);

export const findUserByEmail = (email) =>
  clone(db.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null);

export const listAvailableRiders = () =>
  clone(db.users.filter((user) =>
    user.role === "rider" &&
    user.isAvailable !== false &&
    user.isApproved === true
  ));

export const createUser = (user) => {
  db.users.push(clone(user));
  return clone(user);
};

export const updateUserById = (id, updates) => {
  const index = db.users.findIndex((user) => String(user._id) === String(id));
  if (index < 0) return null;
  db.users[index] = { ...db.users[index], ...clone(updates) };
  return clone(db.users[index]);
};
