import { Client } from "minio";
import { randomUUID } from "crypto";
import { Readable } from "stream";

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT_PUBLIC || "minio",
  port: parseInt(process.env.MINIO_PORT || "9000", 10),
  useSSL: false,
  accessKey: process.env.MINIO_ROOT_USER || "minioadmin",
  secretKey: process.env.MINIO_ROOT_PASSWORD || "minioadmin123",
});

// http://159.223.41.229:30001
// user: minioadmin
// pass: 2dyEswcp7VSPFqta8cFrEqZLDvuoZ6vKzg

export interface MinioUploadResult {
  tmpId: string;
  fileName: string;
  path: string;
  fileUrl: string;
  bucket: string;
}

export async function ensureBucket(bucketName: string, makePublic = true) {
  const exists = await minioClient.bucketExists(bucketName).catch(() => false);

  if (!exists) {
    await minioClient.makeBucket(bucketName);

    if (makePublic) {
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject", "s3:PutObject"],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
    }
  }
}

function isBrowserFile(file: any): file is File {
  return typeof File !== "undefined" && file instanceof File;
}

export async function uploadToMinio(
  file: File | { buffer: Buffer; name: string; type?: string; },
  bucketName?: string,
  makePublic = true
): Promise<MinioUploadResult> {
  if (!file) throw new Error("File is required");

  const bucket = bucketName || process.env.MINIO_BUCKET || "uploads";
  const tmpId = randomUUID();
  const fileName = `${tmpId}-${file instanceof File ? file.name : file.name}`;

  // buat Node.js stream dari file
  let nodeStream: Readable;
  let contentType = "application/octet-stream";

  if (isBrowserFile(file)) {
    const arrayBuffer = await file.arrayBuffer();
    nodeStream = Readable.from(Buffer.from(arrayBuffer));
    contentType = file.type || contentType;
  } else {
    nodeStream = Readable.from(file.buffer);
    if (file.type) contentType = file.type;
  }

  // pastikan bucket ada
  await ensureBucket(bucket, makePublic);

  await minioClient.putObject(bucket, fileName, nodeStream, undefined, {
    "Content-Type": contentType,
  });

  const endpoint = process.env.MINIO_ENDPOINT || "127.0.0.1";
  const port = process.env.MINIO_PORT || "9000";
  const protocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
  const url = `${protocol}://${endpoint}:${port}/${bucket}/${fileName}`;

  return {
    tmpId,
    fileName,
    path: `${bucket}/${fileName}`,
    fileUrl: url,
    bucket,
  };
}

export async function commitFileToMinio(
  tempPath: string,
  targetPath: string,
  meta?: any
) {
  const bucket = process.env.MINIO_BUCKET || "app-storage";
  await ensureBucket(bucket);
  await minioClient.fPutObject(bucket, targetPath, tempPath, meta);
  console.log(`📤 File uploaded to ${bucket}/${targetPath}`);
}


export async function deleteBucket(bucketName: string) {
  const objectsStream = minioClient.listObjects(bucketName, "", true);

  const objects: string[] = [];
  for await (const obj of objectsStream) {
    if (obj.name) objects.push(obj.name);
  }

  if (objects.length) {
    await minioClient.removeObjects(bucketName, objects);
  }

  await minioClient.removeBucket(bucketName);
}
