import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    entityType: { type: String, enum: ["restaurant", "rider"], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    entityName: { type: String, required: true },
    orderIds: [{ type: String }],
    totalOrders: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    payoutAmount: { type: Number, default: 0 },
    status: { type: String, enum: ["PENDING", "PROCESSING", "SETTLED"], default: "PENDING" },
    payoutReference: { type: String },
    settledAt: { type: Date },
    notes: { type: String },
    processedBy: { type: String }
  },
  { timestamps: true }
);

export const Settlement = mongoose.models.Settlement || mongoose.model("Settlement", settlementSchema);
