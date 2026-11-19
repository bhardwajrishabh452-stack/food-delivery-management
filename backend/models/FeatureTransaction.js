import { randomUUID } from "crypto";
import mongoose from "mongoose";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createTransactionModel = (modelName, collectionName, idField) => {
  const schema = new mongoose.Schema(
    {
      _id: { type: String, required: true, match: uuidPattern },
      [idField]: {
        type: String,
        required: true,
        unique: true,
        match: uuidPattern,
        validate: {
          validator(value) {
            return value === this._id;
          },
          message: `${idField} must match the MongoDB document ID`
        }
      },
      status: { type: String, required: true, maxlength: 64 },
      details: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        validate: {
          validator(value) {
            return value !== null && typeof value === "object" && !Array.isArray(value);
          },
          message: "details must be a JSON object"
        }
      },
      createdAt: { type: Date, default: Date.now, index: true },
      updatedAt: { type: Date, default: Date.now }
    },
    {
      collection: collectionName,
      timestamps: true,
      versionKey: false
    }
  );

  return mongoose.models[modelName] || mongoose.model(modelName, schema);
};

const transactionSpecs = {
  restaurantTransactions: ["RestaurantTransaction", "restaurant_transactions", "restaurants_id"],
  menuTransactions: ["MenuTransaction", "menu_transactions", "menus_id"],
  cartTransactions: ["CartTransaction", "cart_transactions", "cart_id"],
  orderTransactions: ["OrderTransaction", "order_transactions", "orders_id"],
  restaurantPanelTransactions: [
    "RestaurantPanelTransaction",
    "restaurant_panel_transactions",
    "restaurant_panel_id"
  ],
  deliveryTransactions: ["DeliveryTransaction", "delivery_transactions", "delivery_id"],
  trackingTransactions: ["TrackingTransaction", "tracking_transactions", "tracking_id"],
  couponTransactions: ["CouponTransaction", "coupon_transactions", "coupons_id"],
  paymentTransactions: ["PaymentTransaction", "payment_transactions", "payments_id"],
  settlementTransactions: ["SettlementTransaction", "settlement_transactions", "settlements_id"]
};

export const featureTransactionIdFields = Object.fromEntries(
  Object.entries(transactionSpecs).map(([key, [, , idField]]) => [key, idField])
);

export const featureTransactionModels = Object.fromEntries(
  Object.entries(transactionSpecs).map(([key, [modelName, collectionName, idField]]) => [
    key,
    createTransactionModel(modelName, collectionName, idField)
  ])
);

export const createFeatureTransaction = (collectionName, status, details, timestamp = new Date().toISOString()) => {
  const transactionId = randomUUID();
  const Model = featureTransactionModels[collectionName];
  const idField = featureTransactionIdFields[collectionName];
  if (!Model || !idField) throw new Error(`Unknown feature transaction collection: ${collectionName}`);

  return {
    _id: transactionId,
    [idField]: transactionId,
    status,
    details,
    createdAt: timestamp,
    updatedAt: timestamp
  };
};
