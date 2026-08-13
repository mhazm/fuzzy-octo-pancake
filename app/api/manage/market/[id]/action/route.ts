import { NextResponse } from "next/server";
import mongoose from "mongoose";
import MarketItem from "@/lib/models/MarketItem";
import Notification from "@/lib/models/Notification";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import dbConnect from "@/lib/mongoose";
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || (session.user.role !== "admin" && session.user.role !== "manager")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { action, reason, editData } = await request.json();
    const item = await MarketItem.findById(id);

    if (!item) {
      return NextResponse.json({ error: "Mod tidak ditemukan" }, { status: 404 });
    }

    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

    if (action === "approve") {
      item.status = "approved";
      item.isPublished = true;
      item.rejectReason = null;
      item.reviewerId = String(session.user.discordId);
      item.reviewerName = session.user.name;
      
      // Update Discord Channel
      if (item.discordChannelId && DISCORD_BOT_TOKEN) {
        await fetch(`https://discord.com/api/v10/channels/${item.discordChannelId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: `✅ Mod **${item.title}** telah disetujui oleh <@${session.user.discordId}> dan sudah live di Market!`
          })
        });
      }

      await Notification.create({
        recipient: item.sellerId,
        title: "Mod Disetujui!",
        message: `Mod "${item.title}" milik Anda telah disetujui dan kini tersedia di Market.`,
        type: "success",
        isRead: false
      });
      
    } else if (action === "reject" || action === "takedown") {
      if (!reason) return NextResponse.json({ error: "Alasan wajib diisi" }, { status: 400 });
      
      item.status = action === "reject" ? "rejected" : action;
      item.isPublished = false;
      item.rejectReason = reason;
      item.reviewerId = String(session.user.discordId);
      item.reviewerName = session.user.name;

      // Update Discord Channel
      if (item.discordChannelId && DISCORD_BOT_TOKEN) {
        await fetch(`https://discord.com/api/v10/channels/${item.discordChannelId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: `❌ Mod **${item.title}** telah di-${action} oleh <@${session.user.discordId}>.\n**Alasan:** ${reason}`
          })
        });
      }

      // Create DM if possible or rely on Website notification
      await Notification.create({
        recipient: item.sellerId,
        title: `Mod ${action === "reject" ? "Ditolak" : "Di-Takedown"}`,
        message: `Mod "${item.title}" Anda telah di-${action}.\nAlasan: ${reason}`,
        type: "error",
        isRead: false
      });
      
    } else if (action === "edit") {
      if (!editData) return NextResponse.json({ error: "Data edit tidak ada" }, { status: 400 });
      
      const changes: any[] = [];
      
      if (editData.title && editData.title !== item.title) {
        changes.push({ name: "Judul Berubah", value: `~~${item.title}~~ -> **${editData.title}**` });
        item.title = editData.title;
      }
      
      if (editData.price !== undefined && Number(editData.price) !== item.price) {
        changes.push({ name: "Harga Berubah", value: `~~${item.price} NC~~ -> **${editData.price} NC**` });
        item.price = Number(editData.price);
      }
      
      if (editData.description && editData.description !== item.description) {
        changes.push({ name: "Deskripsi", value: "Deskripsi telah diperbarui." });
        item.description = editData.description;
      }
      
      if (editData.categories && JSON.stringify(editData.categories) !== JSON.stringify(item.categories)) {
        item.categories = editData.categories;
      }
      
      // Update Discord Channel to inform creator that manager edited it
      if (item.discordChannelId && DISCORD_BOT_TOKEN && changes.length > 0) {
        await fetch(`https://discord.com/api/v10/channels/${item.discordChannelId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: `📝 Manajer <@${session.user.discordId}> melakukan penyesuaian pada detail mod.`,
            embeds: [{
              title: "Perubahan yang Dilakukan",
              color: 0x3b82f6,
              fields: changes
            }]
          })
        });
      }
    }

    await item.save();
    return NextResponse.json({ success: true, message: `Mod berhasil di-${action}`, item });
    
  } catch (error) {
    console.error("Market Action Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
