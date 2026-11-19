import { db } from "../models/store.js";
import { createFeatureTransaction } from "../models/FeatureTransaction.js";
import { clone } from "./clone.js";

export const recordCartSnapshot = (userId, details) => {
  const record = createFeatureTransaction("cartTransactions", details.itemCount ? "active" : "empty", {
    userId: String(userId),
    ...details
  });
  db.cartTransactions.push(record);
  return clone(record);
};
