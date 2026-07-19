import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordId?: string | number | null;
      role: "user" | "manager" | "admin";
      isDriver: boolean;
      truckyId?: string | number | null;
      driverData?: {
        truckyId: number;
        truckyName: string;
      } | null;
      teamId?: string | null;
      teamRole?: "owner" | "admin" | "member" | null;
      xp: number;
      level: number;
      joinedConvoy: number;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    truckyId?: string | number | null;
    discordId?: string | number | null;
  }
}
