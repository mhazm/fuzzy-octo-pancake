const { Schema, model, models } = require("mongoose");

const achievementSchema = new Schema(
  {
    // Kode unik untuk mempermudah pencarian dari webhook (misal: "HW_RUNNER", "EVENT_MERDEKA")
    codeId: { type: String, required: true, unique: true },
    slug: { type: String, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "Belum ada deskripsi." },
    imageUrl: { type: String, default: null },

    category: {
      type: String,
      enum: ["weekly", "monthly", "yearly", "event"],
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = models.Achievement || model("Achievement", achievementSchema);
