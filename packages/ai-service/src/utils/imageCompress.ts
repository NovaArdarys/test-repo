import axios from "axios";
import { decode as decodeJpeg, encode as encodeJpeg } from "@jsquash/jpeg";
import { decode as decodePng, encode as encodePng } from "@jsquash/png";

/**
 * Kompres gambar sesuai format aslinya (JPG → JPG, PNG → PNG),
 * hasilkan string Base64 murni (tanpa prefix data:image/...).
 */
export async function compressImageToBase64(
  url: string,
  targetSizeKB = 60
): Promise<string> {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  console.log(url, "=====resolved=====");
  const inputBuffer = new Uint8Array(response.data);

  const isPNG = inputBuffer[0] === 0x89 && inputBuffer[1] === 0x50;
  const isJPG = inputBuffer[0] === 0xff && inputBuffer[1] === 0xd8;

  if (!isPNG && !isJPG) {
    console.warn("⚠️ Unsupported format, returning original");
    return Buffer.from(inputBuffer).toString("base64");
  }

  let decoded: any;
  if (isJPG) decoded = await decodeJpeg(inputBuffer.buffer);
  else decoded = await decodePng(inputBuffer.buffer);

  const { data, width, height } = decoded;
  const rgba = new Uint8ClampedArray(data.buffer);
  const imageData = new ImageData(rgba, width, height);

  const targetBytes = targetSizeKB * 1024;
  let quality = 80;
  let outputBuffer = Buffer.from(inputBuffer);

  while (quality >= 20) {
    let encoded: ArrayBuffer | Uint8Array;
    if (isJPG) {
      encoded = await encodeJpeg(imageData, { quality });
    } else {
      encoded = await encodePng(imageData);
    }

    outputBuffer = Buffer.from(encoded);
    if (outputBuffer.length <= targetBytes) break;
    quality -= 10;
  }

  console.log(
    `🗜️ Compressed: ${(inputBuffer.length / 1024).toFixed(1)} KB → ${(outputBuffer.length / 1024).toFixed(1)} KB (quality=${quality})`
  );

  return outputBuffer.toString("base64");
}