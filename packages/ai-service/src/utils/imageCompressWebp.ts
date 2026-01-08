import axios from "axios";
import { decode as decodeJpeg } from "@jsquash/jpeg";
import { decode as decodePng } from "@jsquash/png";
import { encode as encodeWebp } from "@jsquash/webp";

export async function compressImageToBase64(
  url: string,
  targetSizeKB = 60
): Promise<string> {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  const inputBuffer = new Uint8Array(response.data);

  const isPNG = inputBuffer[0] === 0x89 && inputBuffer[1] === 0x50;
  const isJPG = inputBuffer[0] === 0xff && inputBuffer[1] === 0xd8;

  let width = 0;
  let height = 0;
  let rgba: Uint8ClampedArray;

  if (isJPG) {
    const decoded = await decodeJpeg(inputBuffer.buffer);
    rgba = new Uint8ClampedArray(decoded.data.buffer);
    width = decoded.width;
    height = decoded.height;
  } else if (isPNG) {
    const decoded = await decodePng(inputBuffer.buffer);
    rgba = new Uint8ClampedArray(decoded.data.buffer);
    width = decoded.width;
    height = decoded.height;
  } else {
    console.warn("⚠️ Unsupported format, returning original");
    return Buffer.from(inputBuffer).toString("base64");
  }

  const imageData: ImageData = {
    data: new Uint8ClampedArray(rgba),
    width,
    height,
    colorSpace: "srgb",
  };

  const targetBytes = targetSizeKB * 1024;
  let quality = 80;
  let webpBuffer: Uint8Array = new Uint8Array();

  while (quality >= 20) {
    const encoded = await encodeWebp(imageData, { quality });
    webpBuffer = new Uint8Array(encoded);
    if (webpBuffer.length <= targetBytes) break;
    quality -= 10;
  }

  console.log(
    `🗜️ Compressed: ${(inputBuffer.length / 1024).toFixed(1)} KB → ${(webpBuffer.length / 1024).toFixed(1)} KB (quality=${quality})`
  );

  return Buffer.from(webpBuffer).toString("base64");
}
