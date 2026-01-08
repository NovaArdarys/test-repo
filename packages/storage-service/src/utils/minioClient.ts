import { Client } from "minio";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import ApiError from "./ApiError";

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT_SERVER || "minio",
  port: parseInt(process.env.MINIO_PORT || "9000", 10),
  useSSL: false,
  accessKey: process.env.MINIO_ROOT_USER || "minioadmin",
  secretKey: process.env.MINIO_ROOT_PASSWORD || "minioadmin123",
});

export interface MinioUploadResult {
  tmpId?: string;
  fileName: string;
  path: string;
  fileUrl: string;
  bucket: string;
}

export async function ensureBucket(
  bucketName: string,
  makePublic = true
) {
  const exists = await minioClient.bucketExists(bucketName).catch(() => false);

  if (!exists) {
    await minioClient.makeBucket(bucketName);
  }

  if (makePublic) {
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: "*",
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    };

    await minioClient.setBucketPolicy(
      bucketName,
      JSON.stringify(policy)
    );
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
  try {
    if (!file) {
      throw new ApiError(400, { message: "MinIO upload failed: File not found" });
    }

    const bucket = bucketName || process.env.MINIO_BUCKET || "uploads";
    const tmpId = randomUUID();
    const fileName = `${tmpId}-${file.name}`;

    let nodeStream: Readable;
    let contentType = "application/octet-stream";

    if (isBrowserFile(file)) {
      const arrayBuffer = await file.arrayBuffer();
      nodeStream = Readable.from(Buffer.from(arrayBuffer));
      contentType = file.type || contentType;
    } else {
      nodeStream = Readable.from(file.buffer);
      contentType = file.type || contentType;
    }

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
  } catch (error: any) {
    console.error("MinIO Upload Error:", error);

    const originalMessage = error?.message || error?.code || "Unknown error";

    throw new ApiError(
      500,
      { message: `MinIO upload failed: ${originalMessage}` },
    );
  }
}

/**
 *
 *
 * @export
 * @param {string} filePath
 * @param {string} fileName
 * @param {string} targetBucket
 * @return {*}  {Promise<string>}
 */
export async function moveFileFromTmp(
  filePath: string,
  fileName: string,
  targetBucket: string
): Promise<MinioUploadResult> {
  const tmpBucket = "temporary";

  const sourceObject = filePath || fileName;
  const targetObject = fileName;

  await ensureBucket(targetBucket, true);

  await minioClient.copyObject(
    targetBucket,
    targetObject,
    `/${tmpBucket}/${sourceObject}`
  );

  await minioClient.removeObject(tmpBucket, sourceObject);

  const newUrl = `${process.env.MINIO_PUBLIC_URL}/${targetBucket}/${targetObject}`;
  return {
    fileName,
    path: `${targetBucket}/${fileName}`,
    fileUrl: newUrl,
    bucket: targetBucket,
  };
}
