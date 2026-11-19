import mongoose from "mongoose";

const deliveryAssignmentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    riderName: { type: String },
    status: {
      type: String,
      enum: ["OFFERED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "REJECTED"],
      default: "OFFERED"
    },
    pickupLocation: {
      street: String,
      city: String,
      lat: Number,
      lng: Number
    },
    dropLocation: {
      street: String,
      city: String,
      lat: Number,
      lng: Number
    },
    assignedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    deliveredAt: { type: Date },
    deliveryFeeEarning: { type: Number, default: 40 }
  },
  { timestamps: true }
);

deliveryAssignmentSchema.index({ orderId: 1 }, { unique: true });

export const DeliveryAssignment =
  mongoose.models.DeliveryAssignment || mongoose.model("DeliveryAssignment", deliveryAssignmentSchema);
