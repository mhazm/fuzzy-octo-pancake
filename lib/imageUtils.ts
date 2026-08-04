import imageCompression from "browser-image-compression";

/**
 * Mengompres gambar menjadi WebP dengan kualitas tinggi namun ukuran kecil.
 * Cocok untuk diupload ke Vercel / Cloudflare R2 agar tidak memberatkan bandwidth.
 * 
 * @param imageFile File gambar mentah (JPEG/PNG dll) dari input user
 * @param maxSizeMB Maksimal ukuran file setelah dikompresi (default 1MB)
 * @param maxWidthOrHeight Maksimal lebar/tinggi resolusi gambar (default 1920)
 * @returns {Promise<File>} File gambar yang sudah dikompresi (WebP)
 */
export async function compressImageToWebP(
  imageFile: File,
  maxSizeMB: number = 1,
  maxWidthOrHeight: number = 1920
): Promise<File> {
  // Hanya proses jika input adalah gambar
  if (!imageFile.type.startsWith("image/")) {
    return imageFile;
  }

  const options = {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: false, // Dimatikan agar tidak terjadi 'failed to fetch' saat mendownload worker script
    fileType: "image/webp" as const, // Paksa menjadi WebP
    initialQuality: 0.8, // Kualitas 80%
  };

  try {
    const compressedBlob = await imageCompression(imageFile, options);
    
    // browser-image-compression mengembalikan Blob, kita perlu merubahnya kembali menjadi File Object
    // dan mengubah ekstensi namanya agar terdeteksi dengan benar di backend
    const originalName = imageFile.name;
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
    const newFileName = `${nameWithoutExt}.webp`;

    const compressedFile = new File([compressedBlob], newFileName, {
      type: "image/webp",
      lastModified: Date.now(),
    });

    return compressedFile;
  } catch (error) {
    console.error("Gagal melakukan kompresi gambar:", error);
    // Jika gagal kompresi, kembalikan file original agar tidak merusak flow upload
    return imageFile;
  }
}
