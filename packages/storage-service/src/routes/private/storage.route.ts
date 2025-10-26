import { Hono } from "hono";
import { randomUUID } from "crypto";
import { minioClient } from "@/utils/minioClient";
import { Readable } from "stream";

const app = new Hono();

app.post("/upload", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file as File;
  if (!file) return c.json({ error: "File is required" }, 400);

  const bucket = process.env.MINIO_BUCKET!;
  const fileName = `${randomUUID()}-${file.name}`;

  const nodeStream = Readable.from(file.stream() as any);

  await minioClient.putObject(bucket, fileName, nodeStream);

  const url = `http://${process.env.MINIO_ENDPOINT}:9000/${bucket}/${fileName}`;
  return c.json({ url });
});

export default app;
