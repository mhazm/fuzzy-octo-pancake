import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { 
      type: String, 
      required: true,
      index: true 
      // "global" for system-wide broadcasts, or Discord ID for specific user
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
      type: String, 
      enum: ["info", "warning", "success", "error", "system"], 
      default: "info" 
    },
    link: { type: String }, // Optional link to redirect when clicked
    readBy: [{ type: String }], // Array of Discord IDs who have read this
    expiresAt: { type: Date } // Optional TTL for auto-delete
  },
  { timestamps: true }
);

// TTL index to automatically delete expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
