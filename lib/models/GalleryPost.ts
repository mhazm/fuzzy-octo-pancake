import mongoose from "mongoose";

const galleryPostSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // discordId of the user
    imageUrl: { type: String, required: true }, // R2 public URL
    caption: { type: String, default: "" },
    likes: { type: [String], default: [] }, // Array of discordIds
  },
  { timestamps: true }
);

export default mongoose.models.GalleryPost || mongoose.model("GalleryPost", galleryPostSchema);
