import { NextResponse } from "next/server";
import mongoose from "mongoose";
import MarketItem from "@/lib/models/MarketItem";
import MarketPurchase from "@/lib/models/MarketPurchase";
import "@/lib/models/User";
import "@/lib/models/MarketReview";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

import dbConnect from "@/lib/mongoose";

export const revalidate = 60;

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const game_id = searchParams.get("game_id");
    const category = searchParams.get("category");

    const query: any = { isPublished: true, status: "approved" };
    if (game_id) query.game_id = Number(game_id);
    if (category) query.categories = category;

    const itemsRaw = await MarketItem.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const items = await Promise.all(
      itemsRaw.map(async (item: any) => {
        const seller = await mongoose.models.User.findOne({
          discordId: item.sellerId,
        }).lean();
        item.sellerName = seller ? seller.name : "Unknown";

        const reviews = await mongoose.models.MarketReview.find({
          marketItemId: item._id,
        }).lean();
        if (reviews && reviews.length > 0) {
          const totalRating = reviews.reduce(
            (sum: number, r: any) => sum + r.rating,
            0,
          );
          item.averageRating = (totalRating / reviews.length).toFixed(1);
          item.reviewsCount = reviews.length;
        } else {
          item.averageRating = 0;
          item.reviewsCount = 0;
        }
        return item;
      }),
    );

    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("GET MarketItem Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data market" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const data = await request.json();

    if (
      !data.title ||
      !data.description ||
      !data.game_id ||
      !data.download_url ||
      !data.slug
    ) {
      return NextResponse.json(
        {
          error:
            "Title, slug, description, game_id, dan download_url wajib diisi",
        },
        { status: 400 },
      );
    }

    // Check if slug exists
    const existingSlug = await MarketItem.findOne({ slug: data.slug });
    if (existingSlug) {
      return NextResponse.json(
        { error: "Slug/URI sudah digunakan, gunakan yang lain" },
        { status: 400 },
      );
    }

    const newItem = await MarketItem.create({
      sellerId: session.user.discordId as string,
      title: data.title,
      slug: data.slug,
      description: data.description,
      price: Number(data.price) || 0,
      categories: data.categories || [],
      game_id: Number(data.game_id),
      game_version: data.game_version || "",
      download_url: data.download_url,
      image_url: data.image_url || "",
      isPublished: false,
      status: "pending",
    });

    // Create Discord Channel for Approval
    try {
      const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
      const GUILD_ID = process.env.DISCORD_GUILD_ID;
      const CATEGORY_ID =
        process.env.DISCORD_TICKET_CATEGORY_ID ||
        process.env.DISCORD_PLUS_CATEGORY_ID;
      const MANAGER_ROLE_ID = process.env.DISCORD_MANAGER_ROLE_ID;

      const safeUsername =
        session.user.name?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ||
        "driver";
      const totalMods = await MarketItem.countDocuments();
      const channelName = `🛍️|market-review-${safeUsername}-${totalMods}`;

      const createChannelRes = await fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: channelName,
            type: 0,
            parent_id: CATEGORY_ID,
            permission_overwrites: [
              { id: GUILD_ID, type: 0, deny: "1024" },
              { id: session.user.discordId, type: 1, allow: "68608" },
              { id: MANAGER_ROLE_ID, type: 0, allow: "68608" },
            ],
          }),
        },
      );

      if (createChannelRes.ok) {
        const channelData = await createChannelRes.json();
        newItem.discordChannelId = channelData.id;
        await newItem.save();

        await fetch(
          `https://discord.com/api/v10/channels/${channelData.id}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: `<@${session.user.discordId}> mengajukan perilisan mod baru! Mohon <@&${MANAGER_ROLE_ID}> mereview.`,
              embeds: [
                {
                  title: `🛒 Review Market Mod: ${newItem.title}`,
                  color: 0x3b82f6,
                  image: newItem.image_url
                    ? { url: newItem.image_url }
                    : undefined,
                  fields: [
                    {
                      name: "Harga",
                      value: `${newItem.price} NC`,
                      inline: true,
                    },
                    {
                      name: "Kategori",
                      value: newItem.categories.join(", ") || "-",
                      inline: true,
                    },
                    {
                      name: "Game",
                      value: newItem.game_id === 1 ? "ETS2" : "ATS",
                      inline: true,
                    },
                    {
                      name: "Deskripsi",
                      value: newItem.description.substring(0, 1000),
                      inline: false,
                    },
                  ],
                },
              ],
            }),
          },
        );
      }
    } catch (discordErr) {
      console.error("Failed to create discord ticket for market:", discordErr);
    }

    // Otomatis berikan hak milik ke penjual (0 NC)
    await MarketPurchase.create({
      buyerId: session.user.discordId as string,
      marketItemId: newItem._id,
      pricePaid: 0,
    });

    return NextResponse.json({
      success: true,
      message: "Mod berhasil ditambahkan!",
      data: newItem,
    });
  } catch (error) {
    console.error("POST MarketItem Error:", error);
    return NextResponse.json(
      { error: "Gagal menambahkan mod" },
      { status: 500 },
    );
  }
}
