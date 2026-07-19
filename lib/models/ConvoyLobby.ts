import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPartisipan {
  truckyId: string;
  discordId: string;
  jobId: number;
}

export interface IConvoyLobby extends Document {
  guildId: string;
  gameId: string;
  convoyUri: string;
  convoyName: string;
  description: string;
  password?: string;
  imageUrl?: string;
  active: boolean;
  setBy?: string;
  typeConvoy: "Mingguan" | "Bulanan";
  startDate?: Date;
  meetupDate?: Date;
  sourceCity?: string;
  destinationCity?: string;
  sourceCompany?: string;
  destinationCompany?: string;
  cargoName?: string;
  cargoMass?: number;
  plannedDistanceKm?: number;
  partisipan: IPartisipan[];
  createdAt: Date;
  updatedAt: Date;
}

const partisipanSchema = new Schema<IPartisipan>(
  {
    truckyId: { type: String },
    discordId: { type: String },
    jobId: { type: Number, default: 0 },
  },
  { _id: false },
);

const convoyLobbySchema = new Schema<IConvoyLobby>(
  {
    guildId: { type: String, required: true },
    gameId: { type: String, required: true }, // 1 = ETS2, 2 = ATS
    convoyUri: { type: String, required: true, unique: true },
    convoyName: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    password: { type: String, required: true },
    active: { type: Boolean, default: true },
    setBy: { type: String },
    typeConvoy: {
      type: String,
      enum: ["Mingguan", "Bulanan"],
      default: "Mingguan",
    },

    startDate: { type: Date },
    meetupDate: { type: Date },

    sourceCity: { type: String },
    destinationCity: { type: String },
    sourceCompany: { type: String },
    destinationCompany: { type: String },
    cargoName: { type: String },
    cargoMass: { type: Number },
    plannedDistanceKm: { type: Number },

    partisipan: [partisipanSchema],
  },
  { timestamps: true },
);

const ConvoyLobby: Model<IConvoyLobby> =
  mongoose.models.ConvoyLobby ||
  mongoose.model<IConvoyLobby>("ConvoyLobby", convoyLobbySchema);

export default ConvoyLobby;
