import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { sendPersonalNotification } from "@/lib/services/NotificationService";

// Inisialisasi R2
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED" as any,
  responseChecksumValidation: "WHEN_REQUIRED" as any,
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { postId } = resolvedParams;
    
    if (!postId || !ObjectId.isValid(postId)) {
      return NextResponse.json({ error: "Post ID tidak valid" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // 1. Cari Postingan
    const post = await db.collection("gallery_posts").findOne({ _id: new ObjectId(postId) });
    if (!post) {
      return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 });
    }

    // 2. Validasi Kepemilikan (Atau Manager)
    const isOwner = post.discordId === session.user.discordId;
    const isManager = session.user.role === "manager" || session.user.role === "admin";
    
    if (!isOwner && !isManager) {
      return NextResponse.json({ error: "Anda tidak memiliki izin untuk menghapus postingan ini" }, { status: 403 });
    }

    // Jika Manager menghapus postingan orang lain, kirim notifikasi
    if (!isOwner && isManager) {
      await sendPersonalNotification(
        post.discordId,
        "Peringatan Moderasi Galeri",
        "Postingan galeri Anda telah dihapus oleh tim moderator karena terdeteksi melanggar kebijakan komunitas Nismara."
      );
    }

    // 3. Kumpulkan semua URL Gambar
    const images: string[] = post.imageUrls && post.imageUrls.length > 0 
      ? post.imageUrls 
      : (post.imageUrl ? [post.imageUrl] : []);

    // 4. Hapus dari R2
    if (images.length > 0) {
      const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
      
      const objectsToDelete = images.map((url) => {
        // Ambil Key S3 dari URL Publik (Hapus base URL dan leading slash)
        let key = url.replace(publicUrlBase, "");
        if (key.startsWith("/")) key = key.substring(1);
        return { Key: key };
      });

      if (objectsToDelete.length > 0) {
        const command = new DeleteObjectsCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Delete: {
            Objects: objectsToDelete,
            Quiet: false,
          },
        });

        try {
          await r2.send(command);
        } catch (r2Error) {
          console.error("Gagal menghapus file di R2:", r2Error);
          // Tetap lanjut hapus DB agar user tidak terjebak error "ghost files"
        }
      }
    }

    // 5. Hapus dari Database MongoDB
    await db.collection("gallery_posts").deleteOne({ _id: new ObjectId(postId) });
    await db.collection("gallery_comments").deleteMany({ postId: new ObjectId(postId) });

    return NextResponse.json({ success: true, message: "Postingan berhasil dihapus" });
  } catch (error: any) {
    console.error("Gallery Delete Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
