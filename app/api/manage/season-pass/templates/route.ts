import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import SeasonPassTemplate from "@/lib/models/SeasonPassTemplate";
import { SEASON_1_LEVELS } from "@/lib/seasonPass";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isManager =
      session?.user?.role === "manager" || session?.user?.role === "admin";

    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized: Akses Manager Diperlukan" }, { status: 403 });
    }

    await dbConnect();

    // Auto-seed default template if empty
    const count = await SeasonPassTemplate.countDocuments();
    if (count === 0) {
      await SeasonPassTemplate.create({
        name: "Template Standar (Season 1: Pioneer of Asphalt)",
        description: "Template default resmi 30 Level dengan kombinasi NC, Fuel, Voucher Servis, NC Booster, dan Mod Livery Eksklusif.",
        isDefault: true,
        totalXp: 250000,
        levels: SEASON_1_LEVELS,
        createdBy: "System",
      });
    }

    const templates = await SeasonPassTemplate.find().sort({ isDefault: -1, createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      templates: JSON.parse(JSON.stringify(templates)),
    });
  } catch (error: any) {
    console.error("Season Pass Templates GET Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat template Season Pass" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isManager =
      session?.user?.role === "manager" || session?.user?.role === "admin";

    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized: Akses Manager Diperlukan" }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const { action = "CREATE", name, description, sourceTemplateId, levels, totalXp = 250000 } = body;

    if (action === "DUPLICATE") {
      if (!sourceTemplateId || !name) {
        return NextResponse.json({ error: "sourceTemplateId dan nama baru wajib diisi" }, { status: 400 });
      }

      const source = await SeasonPassTemplate.findById(sourceTemplateId);
      if (!source) {
        return NextResponse.json({ error: "Template sumber tidak ditemukan" }, { status: 404 });
      }

      const duplicated = await SeasonPassTemplate.create({
        name,
        description: description || `Duplikat dari ${source.name}`,
        isDefault: false,
        totalXp: source.totalXp || 250000,
        levels: source.levels,
        createdBy: session.user.name || "Manager",
      });

      return NextResponse.json({
        success: true,
        message: `Template "${name}" berhasil diduplikasi!`,
        template: duplicated,
      });
    }

    // Default CREATE action
    if (!name) {
      return NextResponse.json({ error: "Nama template wajib diisi" }, { status: 400 });
    }

    const newTemplate = await SeasonPassTemplate.create({
      name,
      description: description || "",
      isDefault: false,
      totalXp: Number(totalXp) || 250000,
      levels: levels && levels.length ? levels : SEASON_1_LEVELS,
      createdBy: session.user.name || "Manager",
    });

    return NextResponse.json({
      success: true,
      message: `Template "${name}" berhasil dibuat!`,
      template: newTemplate,
    });
  } catch (error: any) {
    console.error("Season Pass Template POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat template Season Pass" },
      { status: 500 }
    );
  }
}
