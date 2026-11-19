import { db } from "../models/store.js";
import { clone } from "./clone.js";

export const listSettlements = () => clone(db.settlements);

export const createSettlement = (settlement) => {
  db.settlements.unshift(clone(settlement));
  return clone(settlement);
};
