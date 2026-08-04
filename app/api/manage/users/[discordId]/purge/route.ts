import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ discordId: string }> },
) {
  try {
    const { discordId } = await params;

    // 1. Verifikasi Session & Role Manager
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1.5 Verifikasi Password Purge
    const purgePassword = req.headers.get("x-purge-password");
    if (!purgePassword || purgePassword !== process.env.PASSWORD_PURGE) {
      return NextResponse.json({ error: "Invalid Purge Password" }, { status: 403 });
    }

    if (!discordId) {
      return NextResponse.json(
        { error: "Missing discordId parameter" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // 2. Cek eksistensi user dan ambil ObjectId nya (untuk koleksi yang pakai reference _id)
    const user = await db.collection("users").findOne({ discordId });

    // Kita tetap jalankan purge collection lain menggunakan discordId meskipun user document sudah tidak ada
    const userIdObj = user ? user._id : null;

    // 3. Jalankan operasi penghapusan data secara masif (paralel)
    const deletePromises = [];

    // Koleksi yang terhubung via discordId
    const discordIdCollections = [
      "users",
      "insuranceclaimhistories",
      "survey_responses",
      "garages",
      "userachievements",
      "collectibles",
    ];

    for (const col of discordIdCollections) {
      deletePromises.push(
        db.collection(col).deleteMany({ discordId: discordId }),
      );
    }

    // Koleksi dengan nama field spesifik
    deletePromises.push(
      db.collection("jobhistories").deleteMany({ driverId: discordId }),
    ); // Pekerjaan
    deletePromises.push(
      db.collection("registrations").deleteMany({ userId: discordId }),
    ); // Pendaftaran awal
    deletePromises.push(
      db.collection("tickets").deleteMany({ creatorId: discordId }),
    ); // Tiket bantuan
    deletePromises.push(
      db.collection("gallery_posts").deleteMany({ userId: discordId }),
    ); // Postingan galeri
    deletePromises.push(
      db.collection("gallery_comments").deleteMany({ userId: discordId }),
    ); // Komentar galeri
    deletePromises.push(
      db.collection("driverlinks").deleteMany({ userId: discordId }),
    ); // Driver Link
    deletePromises.push(
      db.collection("currencies").deleteMany({ userId: discordId }),
    ); // Currency
    deletePromises.push(
      db.collection("currencyhistories").deleteMany({ userId: discordId }),
    ); // Currency History
    deletePromises.push(
      db.collection("points").deleteMany({ userId: discordId }),
    ); // Points
    deletePromises.push(
      db.collection("pointhistories").deleteMany({ userId: discordId }),
    ); // Points History
    deletePromises.push(
      db.collection("validatedjobs").deleteMany({ userId: discordId }),
    ); // Validated Jobs

    // Hapus footprint user dari array contributors di contracthistories (bukan menghapus seluruh contract-nya)
    deletePromises.push(
      db
        .collection("contracthistories")
        .updateMany(
          { "contributors.driverId": discordId },
          { $pull: { contributors: { driverId: discordId } as any } },
        ),
    );

    // Hapus footprint user dari array partisipan di convoylobby
    deletePromises.push(
      db
        .collection("convoylobby")
        .updateMany(
          { "partisipan.discordId": discordId },
          { $pull: { partisipan: { discordId: discordId } as any } },
        ),
    );

    // Hapus footprint user dari array driverClaims di couponhistories
    deletePromises.push(
      db
        .collection("couponhistories")
        .updateMany(
          { "driverClaims.driverId": discordId },
          { $pull: { driverClaims: { driverId: discordId } as any } },
        ),
    );

    // Koleksi yang terhubung via ObjectId (jika user ada di db)
    if (userIdObj) {
      // Jika Anda ingin fleet tetap ada tetapi driver-nya dikosongkan (unassigned)
      deletePromises.push(
        db.collection("fleets").updateMany(
          { driver: userIdObj },
          { $set: { driver: null } }
        ),
      );
      deletePromises.push(
        db.collection("sessions").deleteMany({ userId: userIdObj }),
      );
      deletePromises.push(
        db.collection("accounts").deleteMany({ userId: userIdObj }),
      );
      deletePromises.push(
        db.collection("fleetorders").deleteMany({ userId: userIdObj }),
      );
    }

    await Promise.all(deletePromises);

    // TODO: Hapus role Nismara / Discord di masa depan bila diperlukan via Discord API.

    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus seluruh data untuk pengguna dengan Discord ID: ${discordId}`,
      deletedUserObj: userIdObj,
    });
  } catch (error: any) {
    console.error("Purge User Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
