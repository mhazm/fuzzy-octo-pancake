import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPartisipan {
  truckyId: string;
  discordId: string;
  jobId: number;
  claimedReward?: boolean;
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
  gameplayType: "Convoy Lobby" | "TruckersMP";
  lobbyId?: string;
  serverName?: string;
  partisipan: IPartisipan[];
  interested: string[]; // array of discordIds
  roadCaptain?: string; // discordId
  sweeper?: string; // discordId
  rewards?: {
    participantBase: number;
    participantMultiplier: number;
    rc: number;
    sweeper: number;
    manager: number;
  };
  ticketNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const partisipanSchema = new Schema<IPartisipan>(
  {
    truckyId: { type: String },
    discordId: { type: String },
    jobId: { type: Number, default: 0 },
    claimedReward: { type: Boolean, default: false },
  },
  { _id: false },
);

const convoyLobbySchema = new Schema<IConvoyLobby>(
  {
    guildId: { type: String, required: true },
    gameId: { type: String, required: true }, // 1 = ETS2, 2 = ATS
    gameplayType: { type: String, enum: ["Convoy Lobby", "TruckersMP"], default: "Convoy Lobby" },
    lobbyId: { type: String, default: "85568392935732469" },
    serverName: { type: String },
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
    interested: [{ type: String }],
    roadCaptain: { type: String },
    sweeper: { type: String },
    
    rewards: {
      participantBase: { type: Number, default: 1000 },
      participantMultiplier: { type: Number, default: 150 },
      rc: { type: Number, default: 1500 },
      sweeper: { type: Number, default: 1500 },
      manager: { type: Number, default: 3000 },
    },
    ticketNumber: { type: String },
  },
  { timestamps: true },
);

const ConvoyLobby: Model<IConvoyLobby> =
  mongoose.models.ConvoyLobby ||
  mongoose.model<IConvoyLobby>("ConvoyLobby", convoyLobbySchema);

export default ConvoyLobby;
