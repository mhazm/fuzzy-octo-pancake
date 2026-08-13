import mongoose from "mongoose";
import clientPromise from "@/lib/mongodb";
import Notification from "@/lib/models/Notification";

/**
 * Send a notification to a specific user via their Discord ID.
 */
export async function sendPersonalNotification(
  discordId: string,
  title: string,
  message: string,
  type: "info" | "warning" | "success" | "error" | "system" = "info",
  link?: string
) {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }
    
    // Automatically expire personal notifications after 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const notification = await Notification.create({
      recipient: discordId,
      title,
      message,
      type,
      link,
      expiresAt
    });

    return { success: true, data: notification };
  } catch (error: any) {
    console.error("Failed to send personal notification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a global broadcast notification to ALL users.
 */
export async function sendGlobalNotification(
  title: string,
  message: string,
  type: "info" | "warning" | "success" | "error" | "system" = "system",
  link?: string
) {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    // Automatically expire global notifications after 14 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const notification = await Notification.create({
      recipient: "global",
      title,
      message,
      type,
      link,
      expiresAt
    });

    return { success: true, data: notification };
  } catch (error: any) {
    console.error("Failed to send global notification:", error);
    return { success: false, error: error.message };
  }
}
