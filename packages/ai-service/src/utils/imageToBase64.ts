import axios from "axios";

/**
 * Download image dari URL dan ubah ke Base64 string
 * @param url - URL file dari MinIO
 * @returns base64 string (tanpa data URI prefix)
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });

    const buffer = Buffer.from(response.data, "binary");
    return buffer.toString("base64");

  } catch (err: any) {
    console.error(`❌ Failed to fetch image from ${url}: ${err.message}`);
    throw err;
  }
}
