import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    rating: { type: Number, default: 4.5 },
    badge: { type: String },
    image: { type: String }
  },
  { timestamps: true }
);

export const MenuItem = mongoose.models.MenuItem || mongoose.model("MenuItem", menuItemSchema);
