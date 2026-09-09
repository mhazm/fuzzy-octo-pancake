import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { deleteFileFromR2 } from "@/lib/r2";
import { redis } from "@/lib/redis";
import { ObjectId } from "mongodb";

function isR2Url(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  return (
    url.includes("images.nismara.my.id") ||
    url.includes("nismara.id") ||
    url.includes("r2.cloudflarestorage.com")
  );
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ discordId: string }> },
) {
  try {
    const { discordId } = await params;

    // 1. Verifikasi Keamanan: Bisa via Bot Token (NISMARA_SECRET_API) atau Session Manager Web + Password Purge
    const authHeader = req.headers.get("authorization");
    const purgePassword = req.headers.get("x-purge-password");
    const expectedBotToken = process.env.NISMARA_SECRET_API;

    const isBotAuthorized = Boolean(
      expectedBotToken && authHeader === `Bearer ${expectedBotToken}`
    );

    if (!isBotAuthorized) {
      // Jika bukan dari Bot resmi, wajib session Manager
      const session = await getServerSession(authOptions);
      if (!session || session.user.role !== "manager") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Serta wajib Password Purge
      if (!purgePassword || purgePassword !== process.env.PASSWORD_PURGE) {
        return NextResponse.json({ error: "Invalid Purge Password" }, { status: 403 });
      }
    }

    if (!discordId) {
      return NextResponse.json(
        { error: "Missing discordId parameter" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // 2. Ambil data user terlebih dahulu (jika ada) untuk mengumpulkan referensi media & id
    const user = await db.collection("users").findOne({ discordId });
    const userIdObj = user ? (user._id as ObjectId) : null;
    const userTruckyId = user?.truckyId ? String(user.truckyId) : null;

    // Kumpulan URL media di R2 yang harus dihapus
    const mediaUrlsToDelete: string[] = [];

    // 2.1 Media Profil User
    if (user) {
      if (user.image) mediaUrlsToDelete.push(user.image);
      if (user.avatar) mediaUrlsToDelete.push(user.avatar);
      if (user.bannerUrl) mediaUrlsToDelete.push(user.bannerUrl);
      if (user.backgroundUrl) mediaUrlsToDelete.push(user.backgroundUrl);
      if (user.customBackground) mediaUrlsToDelete.push(user.customBackground);
    }

    // 2.2 Media Gallery Posts milik User
    const userGalleryPosts = await db
      .collection("gallery_posts")
      .find({ userId: discordId })
      .toArray();
    for (const post of userGalleryPosts) {
      if (post.imageUrl) mediaUrlsToDelete.push(post.imageUrl);
    }

    // 2.3 Media Market Items yang diupload oleh User
    const userMarketItems = await db
      .collection("marketitems")
      .find({ sellerId: discordId })
      .toArray();
    for (const item of userMarketItems) {
      if (item.image_url) mediaUrlsToDelete.push(item.image_url);
    }

    // 3. Penanganan Khusus Fleet (Owner vs Driver) & Garasi
    // 3.1 Identifikasi Armada yang DIMILIKI (Owner) oleh user
    const fleetOwnerFilter: any[] = [{ owner: discordId }];
    if (userIdObj) {
      fleetOwnerFilter.push({ owner: userIdObj });
      fleetOwnerFilter.push({ owner: userIdObj.toString() });
    }

    const ownedFleets = await db
      .collection("fleets")
      .find({ $or: fleetOwnerFilter })
      .toArray();
    const ownedFleetIds = ownedFleets.map((f) => f._id);

    // Kumpulkan customImage armada milik user untuk dihapus dari R2
    for (const f of ownedFleets) {
      if (f.customImage) mediaUrlsToDelete.push(f.customImage);
    }

    if (ownedFleetIds.length > 0) {
      // Bebaskan slot servis di garageslots yang sedang digunakan oleh armada milik user
      await db.collection("garageslots").updateMany(
        { fleetId: { $in: ownedFleetIds } },
        { $set: { status: "available", fleetId: null, currentOrderId: null } },
      );

      // Cari order perawatan (fleetmaintenanceorders) yang terkait dengan armada milik user
      const maintenanceOrders = await db
        .collection("fleetmaintenanceorders")
        .find({
          $or: [
            { fleetId: { $in: ownedFleetIds } },
            { discordId: discordId },
            ...(userIdObj ? [{ userRef: userIdObj }] : []),
          ],
        })
        .toArray();
      const maintenanceOrderIds = maintenanceOrders.map((m) => m._id);

      if (maintenanceOrderIds.length > 0) {
        // Bebaskan slot garageslots yang terkunci oleh order servis tersebut
        await db.collection("garageslots").updateMany(
          { currentOrderId: { $in: maintenanceOrderIds } },
          { $set: { status: "available", currentOrderId: null, fleetId: null } },
        );

        // Hapus seluruh dokumen order servis terkait
        await db.collection("fleetmaintenanceorders").deleteMany({
          _id: { $in: maintenanceOrderIds },
        });
      }

      // Lepaskan referensi fleet_data.fleet_id pada jobhistories agar tidak merujuk ke fleet yang terhapus
      await db.collection("jobhistories").updateMany(
        { "fleet_data.fleet_id": { $in: ownedFleetIds } },
        { $set: { "fleet_data.fleet_id": null } },
      );

      // Hapus seluruh armada yang dimiliki user secara permanen
      await db.collection("fleets").deleteMany({ _id: { $in: ownedFleetIds } });
    }

    // 3.2 Untuk armada milik pihak lain/perusahaan yang mana user hanya ditugaskan sebagai DRIVER:
    const fleetDriverFilter: any[] = [{ driver: discordId }];
    if (userIdObj) {
      fleetDriverFilter.push({ driver: userIdObj });
      fleetDriverFilter.push({ driver: userIdObj.toString() });
    }
    await db.collection("fleets").updateMany(
      { $or: fleetDriverFilter },
      { $set: { driver: null } },
    );

    // 4. Penanganan Tim (teams)
    if (userIdObj) {
      const ownedTeams = await db
        .collection("teams")
        .find({ owner: userIdObj })
        .toArray();

      for (const team of ownedTeams) {
        const otherMembers = (team.members || []).filter(
          (m: any) => m.toString() !== userIdObj.toString(),
        );

        if (otherMembers.length > 0) {
          // Transfer kepemilikan tim ke anggota berikutnya
          await db.collection("teams").updateOne(
            { _id: team._id },
            {
              $set: { owner: otherMembers[0] },
              $pull: { members: userIdObj, pendingRequests: userIdObj } as any,
            },
          );
        } else {
          // Tim tidak memiliki anggota lain, hapus tim dan medianya
          if (team.logoUrl) mediaUrlsToDelete.push(team.logoUrl);
          if (team.bannerUrl) mediaUrlsToDelete.push(team.bannerUrl);
          await db.collection("teams").deleteOne({ _id: team._id });
        }
      }

      // Hapus user dari array members dan pendingRequests di tim mana pun
      await db.collection("teams").updateMany(
        {},
        { $pull: { members: userIdObj, pendingRequests: userIdObj } as any },
      );
    }

    // 5. Eksekusi Penghapusan File Media di Cloudflare R2
    for (const mediaUrl of mediaUrlsToDelete) {
      if (isR2Url(mediaUrl)) {
        await deleteFileFromR2(mediaUrl);
      }
    }

    // 6. Eksekusi Penghapusan Dokumen Massal di Seluruh Koleksi
    const deletePromises: Promise<any>[] = [];

    // Helper filter untuk koleksi yang bisa menggunakan discordId atau ObjectId
    const userOrDiscordFilter = userIdObj
      ? {
          $or: [
            { discordId: discordId },
            { userId: userIdObj },
            { userId: userIdObj.toString() },
          ],
        }
      : { $or: [{ discordId: discordId }, { userId: discordId }] };

    // Bersihkan Channel Evaluasi Discord jika masih aktif
    const activeEval = await db.collection("driverevaluations").findOne({ driverId: discordId, status: "active" });
    if (activeEval?.channelId && process.env.DISCORD_BOT_TOKEN) {
      try {
        await fetch(`https://discord.com/api/v10/channels/${activeEval.channelId}`, {
          method: "DELETE",
          headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
        });
      } catch (e) {
        console.error("Purge: failed to delete discord evaluation channel", e);
      }
    }

    // --- User Core & Auth ---
    deletePromises.push(db.collection("users").deleteMany({ discordId }));
    if (userIdObj) {
      deletePromises.push(db.collection("users").deleteMany({ _id: userIdObj }));
      deletePromises.push(db.collection("accounts").deleteMany({ userId: userIdObj }));
      deletePromises.push(db.collection("sessions").deleteMany({ userId: userIdObj }));
    }
    deletePromises.push(db.collection("driverlinks").deleteMany({ userId: discordId }));
    deletePromises.push(db.collection("registrations").deleteMany({ userId: discordId }));

    // --- Garasi & Pembelian Fleet ---
    deletePromises.push(
      db.collection("garages").deleteMany({
        $or: [{ discordId }, ...(userIdObj ? [{ userId: userIdObj }] : [])],
      }),
    );
    deletePromises.push(
      db.collection("fleetorders").deleteMany({
        $or: [{ discordId }, ...(userIdObj ? [{ userId: userIdObj }] : [])],
      }),
    );
    deletePromises.push(
      db.collection("fleetmaintenanceorders").deleteMany({
        $or: [{ discordId }, ...(userIdObj ? [{ userRef: userIdObj }] : [])],
      }),
    );

    // --- Ekonomi & Poin Penalti ---
    deletePromises.push(db.collection("currencies").deleteMany({ userId: discordId }));
    deletePromises.push(db.collection("currencyhistories").deleteMany({ userId: discordId }));
    deletePromises.push(db.collection("points").deleteMany({ userId: discordId }));
    deletePromises.push(db.collection("pointhistories").deleteMany({ userId: discordId }));
    deletePromises.push(
      db.collection("penaltytickets").deleteMany({
        $or: [{ discordId }, ...(userTruckyId ? [{ driverId: userTruckyId }] : [])],
      }),
    );

    // --- Transaksi, Order & Belanja ---
    deletePromises.push(
      db.collection("transactions").deleteMany({
        $or: [{ discordId }, ...(userIdObj ? [{ userId: userIdObj }] : [])],
      }),
    );
    deletePromises.push(db.collection("marketpurchases").deleteMany({ buyerId: discordId }));
    deletePromises.push(db.collection("marketreviews").deleteMany({ buyerId: discordId }));
    deletePromises.push(db.collection("marketitems").deleteMany({ sellerId: discordId }));

    // --- Seasonal Pass, Voucher & Nismara+ ---
    deletePromises.push(
      db.collection("uservouchers").deleteMany({
        $or: [{ discordId }, ...(userIdObj ? [{ userId: userIdObj }] : [])],
      }),
    );
    deletePromises.push(
      db.collection("userseasonprogresses").deleteMany({
        $or: [{ discordId }, ...(userIdObj ? [{ userId: userIdObj }] : [])],
      }),
    );
    deletePromises.push(
      db.collection("seasonpassorders").deleteMany({
        $or: [{ discordId }, ...(userIdObj ? [{ userId: userIdObj }] : [])],
      }),
    );
    deletePromises.push(
      db.collection("seasonpassmerchclaims").deleteMany({
        $or: [{ discordId }, ...(userIdObj ? [{ userId: userIdObj }] : [])],
      }),
    );
    deletePromises.push(
      db.collection("nplusweeklyquestclaims").deleteMany({
        $or: [{ discordId }, ...(userIdObj ? [{ userId: userIdObj }] : [])],
      }),
    );
    deletePromises.push(
      db.collection("nismaraplusorders").deleteMany({
        $or: [{ discordId }, ...(userIdObj ? [{ userId: userIdObj }] : [])],
      }),
    );

    // --- Fuel & Bahan Bakar ---
    deletePromises.push(
      db.collection("fuelmarketlistings").deleteMany({
        $or: [{ sellerDiscordId: discordId }, ...(userIdObj ? [{ sellerId: userIdObj }] : [])],
      }),
    );
    deletePromises.push(
      db.collection("fueltransactions").deleteMany({
        $or: [{ buyerDiscordId: discordId }, { sellerDiscordId: discordId }],
      }),
    );
    deletePromises.push(db.collection("fuelusagehistories").deleteMany({ discordId }));

    // --- Pekerjaan & Validasi ---
    deletePromises.push(db.collection("jobhistories").deleteMany({ driverId: discordId }));
    deletePromises.push(db.collection("activejobs").deleteMany({ driverId: discordId }));
    deletePromises.push(db.collection("validatedjobs").deleteMany({ userId: discordId }));
    deletePromises.push(db.collection("specialcontracthistories").deleteMany({ driverId: discordId }));

    // --- Asuransi & Izin Driver ---
    deletePromises.push(db.collection("insuranceclaimhistories").deleteMany({ discordId }));
    deletePromises.push(
      db.collection("leavehistories").deleteMany({
        $or: [
          { userId: discordId },
          ...(userTruckyId ? [{ truckyId: userTruckyId }, { truckyId: Number(userTruckyId) }] : []),
        ],
      }),
    );

    // --- Tiket Bantuan & Rekrutmen (Applications) ---
    deletePromises.push(
      db.collection("tickets").deleteMany({
        $or: [
          { discordId: discordId },
          { creatorId: discordId },
          ...(userIdObj ? [{ userId: userIdObj.toString() }, { userId: userIdObj }] : []),
        ],
      }),
    );
    deletePromises.push(
      db.collection("applications").deleteMany({ "applicant.discordId": discordId }),
    );

    // --- Galeri & Konten Sosial ---
    deletePromises.push(db.collection("gallery_posts").deleteMany({ userId: discordId }));
    deletePromises.push(db.collection("gallery_comments").deleteMany({ userId: discordId }));

    // --- Gamifikasi, Tiket Minigame & Achievement ---
    deletePromises.push(db.collection("userachievements").deleteMany({ discordId }));
    deletePromises.push(db.collection("collectibles").deleteMany({ discordId }));
    deletePromises.push(db.collection("survey_responses").deleteMany({ discordId }));
    deletePromises.push(db.collection("quizattempts").deleteMany({ discordId }));
    deletePromises.push(db.collection("internpromotions").deleteMany({ internDiscordId: discordId }));
    deletePromises.push(db.collection("driverevaluations").deleteMany({ driverId: discordId }));
    deletePromises.push(db.collection("aichathistories").deleteMany({ discordId }));
    deletePromises.push(db.collection("securityalerts").deleteMany({ discordId }));
    deletePromises.push(db.collection("lottotickets").deleteMany({ discordId }));
    deletePromises.push(db.collection("scratchtickets").deleteMany({ discordId }));
    deletePromises.push(db.collection("racingtickets").deleteMany({ discordId }));
    deletePromises.push(db.collection("giveawaytickets").deleteMany({ discordId }));
    deletePromises.push(db.collection("managersalaryrecords").deleteMany({ managerId: discordId }));

    // --- Notifikasi Langsung ---
    deletePromises.push(db.collection("notifications").deleteMany({ recipient: discordId }));

    // 7. Pembersihan Jejak Footprint User dari Array & Relasi Bersama
    // 7.1 Hapus Likes di Galeri
    deletePromises.push(
      db.collection("gallery_posts").updateMany(
        { likes: discordId },
        { $pull: { likes: discordId } as any },
      ),
    );

    // 7.2 Hapus Jejak di Convoy Lobby (Partisipan, Interested, Role)
    deletePromises.push(
      db.collection("convoylobby").updateMany(
        { "partisipan.discordId": discordId },
        { $pull: { partisipan: { discordId: discordId } as any } },
      ),
    );
    deletePromises.push(
      db.collection("convoylobby").updateMany(
        { interested: discordId },
        { $pull: { interested: discordId } as any },
      ),
    );
    deletePromises.push(
      db.collection("convoylobby").updateMany(
        { roadCaptain: discordId },
        { $set: { roadCaptain: null } },
      ),
    );
    deletePromises.push(
      db.collection("convoylobby").updateMany(
        { sweeper: discordId },
        { $set: { sweeper: null } },
      ),
    );

    // 7.3 Hapus Contributors di Kontrak Aktif & Riwayat Kontrak
    deletePromises.push(
      db.collection("contracts").updateMany(
        { "contributors.driverId": discordId },
        { $pull: { contributors: { driverId: discordId } as any } },
      ),
    );
    deletePromises.push(
      db.collection("contracthistories").updateMany(
        { "contributors.driverId": discordId },
        { $pull: { contributors: { driverId: discordId } as any } },
      ),
    );

    // 7.4 Hapus Riwayat Klaim Kupon
    deletePromises.push(
      db.collection("coupons").updateMany(
        {},
        {
          $pull: {
            driverClaims: {
              $or: [
                { discordId: discordId },
                { driverId: discordId },
                ...(userTruckyId ? [{ driverId: userTruckyId }] : []),
              ],
            },
          } as any,
        },
      ),
    );

    // 7.5 Hapus Partisipan Community Goals & Winners Giveaway & NC Events
    deletePromises.push(
      db.collection("communitygoals").updateMany(
        { "participants.discordId": discordId },
        { $pull: { participants: { discordId: discordId } as any } },
      ),
    );
    deletePromises.push(
      db.collection("giveaways").updateMany(
        { "winners.discordId": discordId },
        { $pull: { winners: { discordId: discordId } as any } },
      ),
    );
    deletePromises.push(
      db.collection("ncevents").updateMany(
        { "participants.discordId": discordId },
        { $pull: { participants: { discordId: discordId } as any } },
      ),
    );

    // 7.6 Hapus footprint di Broadcast Notifications
    deletePromises.push(
      db.collection("notifications").updateMany(
        {},
        { $pull: { readBy: discordId, deletedBy: discordId } as any },
      ),
    );

    // Jalankan seluruh operasi delete & update paralel
    await Promise.all(deletePromises);

    // 8. Invalidate Redis Session Cache
    try {
      const redisKeys = [`session:profile:${discordId}`];
      if (userIdObj) {
        redisKeys.push(`session:profile:${userIdObj.toString()}`);
      }
      for (const k of redisKeys) {
        await redis.del(k);
      }
    } catch (redisErr) {
      console.error("Purge Redis Cache Invalidation Error:", redisErr);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus seluruh data tanpa sisa untuk pengguna dengan Discord ID: ${discordId}`,
      deletedUserObj: userIdObj,
      ownedFleetsDeleted: ownedFleetIds.length,
      mediaFilesDeleted: mediaUrlsToDelete.length,
    });
  } catch (error: any) {
    console.error("Purge User Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
