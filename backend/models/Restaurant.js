import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    tagline: { type: String },
    cuisine: [{ type: String }],
    rating: { type: Number, default: 4.5 },
    reviewCount: { type: Number, default: 0 },
    deliveryTimeMinutes: { type: Number, default: 30 },
    priceForTwo: { type: Number, default: 400 },
    minOrderAmount: { type: Number, default: 100 },
    commissionRate: { type: Number, default: 15 }, // 15% platform commission cut
    isOpen: { type: Boolean, default: true },
    isApproved: {
      type: Boolean,
      default() {
        return this.ownerId === null || this.ownerId === undefined;
      }
    },
    featured: { type: Boolean, default: false },
    image: { type: String },
    address: {
      street: String,
      city: String,
      lat: Number,
      lng: Number
    },
    bankDetails: {
      accountNumber: String,
      bankName: String,
      ifsc: String,
      upiId: String
    }
  },
  { timestamps: true }
);

export const Restaurant = mongoose.models.Restaurant || mongoose.model("Restaurant", restaurantSchema);
