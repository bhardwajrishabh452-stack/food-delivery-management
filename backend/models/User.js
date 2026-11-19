import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["customer", "restaurant", "rider", "admin"],
      default: "customer"
    },
    phone: { type: String },
    isDemo: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    address: {
      street: String,
      city: String,
      lat: Number,
      lng: Number
    },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
    isAvailable: { type: Boolean, default: true },
    currentLocation: {
      lat: Number,
      lng: Number
    },
    vehicleDetails: {
      type: { type: String },
      number: String,
      model: String
    },
    earnings: {
      today: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      tripsCompleted: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
