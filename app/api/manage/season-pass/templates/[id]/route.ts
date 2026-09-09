import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import SeasonPassTemplate from "@/lib/models/SeasonPassTemplate";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const isManager =
      session?.user?.role === "manager" || session?.user?.role === "admin";

    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized: Akses Manager Diperlukan" }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();

    const template = await SeasonPassTemplate.findById(id).lean();
    if (!template) {
      return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      template: JSON.parse(JSON.stringify(template)),
    });
  } catch (error: any) {
    console.error("Season Pass Template GET ID Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat template" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const isManager =
      session?.user?.role === "manager" || session?.user?.role === "admin";

    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized: Akses Manager Diperlukan" }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();

    const body = await request.json();
    const { name, description, levels, totalXp, isDefault } = body;

    const template = await SeasonPassTemplate.findById(id);
    if (!template) {
      return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
    }

    if (name) template.name = name;
    if (description !== undefined) template.description = description;
    if (totalXp) template.totalXp = Number(totalXp);
    if (levels && Array.isArray(levels)) template.levels = levels;
    if (isDefault !== undefined) template.isDefault = Boolean(isDefault);

    await template.save();

    return NextResponse.json({
      success: true,
      message: `Template "${template.name}" berhasil diperbarui!`,
      template,
    });
  } catch (error: any) {
    console.error("Season Pass Template PUT Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const isManager =
      session?.user?.role === "manager" || session?.user?.role === "admin";

    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized: Akses Manager Diperlukan" }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();

    const template = await SeasonPassTemplate.findById(id);
    if (!template) {
      return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
    }

    if (template.isDefault) {
      return NextResponse.json(
        { error: "Template default sistem tidak dapat dihapus." },
        { status: 400 }
      );
    }

    await SeasonPassTemplate.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `Template "${template.name}" berhasil dihapus!`,
    });
  } catch (error: any) {
    console.error("Season Pass Template DELETE Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghapus template" },
      { status: 500 }
    );
  }
}
