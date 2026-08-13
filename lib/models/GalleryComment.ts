import mongoose from "mongoose";

const galleryCommentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "GalleryPost", required: true },
    userId: { type: String, required: true }, // discordId of the commenter
    text: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.GalleryComment || mongoose.model("GalleryComment", galleryCommentSchema);
