import axios from "axios";

export function getInternalMinioUrl(url: string): string {
  const publicBase = process.env.MINIO_ENDPOINT || "http://127.0.0.1:9000";
  const internalBase = process.env.MINIO_INTERNAL_URL || "http://minio:9000";

  if (url.startsWith(publicBase)) {
    const newUrl = url.replace(publicBase, internalBase);
    console.log(`🔁 Rewritten MinIO URL:\n  ${url} → ${newUrl}`);
    return newUrl;
  }

  return url;
}

/**
 * Download image dari URL dan ubah ke Base64 string
 * @param url - URL file dari MinIO
 * @returns base64 string (tanpa data URI prefix)
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const resolvedUrl = getInternalMinioUrl(url);

    const response = await axios.get(resolvedUrl, { responseType: "arraybuffer" });

    const buffer = Buffer.from(response.data, "binary");
    return buffer.toString("base64");

  } catch (err: any) {
    console.error(`❌ Failed to fetch image from ${url}: ${err.message}`);
    throw err;
  }
}
