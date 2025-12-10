import axios from "axios";
import { decode as decodeJpeg, encode as encodeJpeg } from "@jsquash/jpeg";
import { decode as decodePng, encode as encodePng } from "@jsquash/png";
const ImageData = require('@canvas/image-data');
import { getInternalMinioUrl } from "./imageToBase64";

export async function compressImageToBase64(
  url: string,
  targetSizeKB = 60
): Promise<string> {
  const resolvedUrl = getInternalMinioUrl(url);

  const response = await axios.get(resolvedUrl, { responseType: "arraybuffer" });
  const inputBuffer = new Uint8Array(response.data);

  const isPNG = inputBuffer[0] === 0x89 && inputBuffer[1] === 0x50;
  const isJPG = inputBuffer[0] === 0xff && inputBuffer[1] === 0xd8;

  if (!isPNG && !isJPG) {
    return Buffer.from(inputBuffer).toString("base64");
  }

  const decoded = isJPG
    ? await decodeJpeg(inputBuffer.buffer)
    : await decodePng(inputBuffer.buffer);

  const { data, width, height } = decoded;
  const rgba = new Uint8ClampedArray(data.buffer);
  const imageData = new ImageData(rgba, width, height);

  const targetBytes = targetSizeKB * 1024;

  let outputBuffer: Buffer;

  if (isJPG) {
    let quality = 80;
    let encoded = await encodeJpeg(imageData, { quality });
    outputBuffer = Buffer.from(encoded);

    while (quality >= 20 && outputBuffer.length > targetBytes) {
      quality -= 10;
      encoded = await encodeJpeg(imageData, { quality });
      outputBuffer = Buffer.from(encoded);
    }

    return outputBuffer.toString("base64");
  }

  const encoded = await encodePng(imageData);
  outputBuffer = Buffer.from(encoded);

  return outputBuffer.toString("base64");
}
