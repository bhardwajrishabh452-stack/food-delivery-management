import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  isVeg: { type: Boolean, default: true }
});

const orderTimelineSchema = new mongoose.Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String },
  actorId: { type: String },
  actorRole: { type: String, enum: ["customer", "restaurant", "rider", "admin"] }
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    customerName: { type: String },
    customerPhone: { type: String },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    restaurantName: { type: String },
    restaurantAddress: {
      street: String,
      city: String,
      lat: Number,
      lng: Number
    },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    riderName: { type: String },
    riderPhone: { type: String },
    items: [orderItemSchema],
    pricing: {
      subtotal: { type: Number, required: true },
      tax: { type: Number, required: true },
      deliveryFee: { type: Number, required: true },
      packagingFee: { type: Number, default: 20 },
      discount: { type: Number, default: 0 },
      total: { type: Number, required: true }
    },
    splits: { type: mongoose.Schema.Types.Mixed },
    couponCode: { type: String },
    payment: {
      method: { type: String, enum: ["CARD", "UPI", "NETBANKING", "COD"], default: "UPI" },
      status: { type: String, enum: ["PENDING", "COMPLETED", "FAILED"], default: "COMPLETED" },
      transactionId: { type: String }
    },
    deliveryAddress: {
      street: String,
      city: String,
      lat: Number,
      lng: Number,
      contactPhone: String
    },
    status: {
      type: String,
      enum: [
        "PLACED",
        "CONFIRMED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED"
      ],
      default: "PLACED"
    },
    currentLocation: {
      lat: Number,
      lng: Number
    },
    simulationStep: { type: Number },
    deliveredAt: { type: Date },
    estimatedDeliveryMinutes: { type: Number, default: 30 },
    timeline: [orderTimelineSchema]
  },
  { timestamps: true }
);

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
