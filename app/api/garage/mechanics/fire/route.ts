import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Garage from "@/lib/models/Garage";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { specialty } = await request.json();

    if (!["umum", "ban", "mesin"].includes(specialty)) {
      return NextResponse.json({ error: "Invalid specialty" }, { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const garage = await Garage.findOne({ discordId: session.user.discordId });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    if (!garage.mechanics || !garage.mechanics[specialty]?.name) {
      return NextResponse.json({ error: `Anda tidak memiliki mekanik untuk tipe ${specialty}` }, { status: 400 });
    }

    // Set mechanic slot to null
    garage.mechanics[specialty] = { name: null, level: null, boostPercentage: null, salary: null, extendAt: null };
    
    // Explicitly tell mongoose we modified it
    garage.markModified('mechanics');
    await garage.save();

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil memecat Mekanik Spesialis ${specialty}`
    });

  } catch (error: any) {
    console.error("Fire Mechanic Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
