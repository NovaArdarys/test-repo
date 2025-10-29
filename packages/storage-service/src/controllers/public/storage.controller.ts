import { publishStorageUpload, StorageUploadEvent } from "@/messaging/publishers/storage.publisher";
import { saveStorageRecord } from "@/services/repositories/storage.service";
import { catchAsync } from "@/utils/catchAsync";
import { uploadToMinio } from "@/utils/minioClient";
import { uploadBodySchema, uploadBodyType } from "@/validator/storage.validator";
import { Context } from "hono";

const getAuditFields = (c: Context) => ({
  created_by: c.get('userId'),
  updated_by: c.get('userId'),
  userId: c.get('userId'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  schoolId: c.get("schoolId") as string[],
});

export const storageHandler = catchAsync(async (c) => {
  const body = await c.req.parseBody() as unknown as uploadBodyType;
  const audit = getAuditFields(c);

  const result = await uploadToMinio(body.file, "temporary");

  // Event untuk publisher/log
  const { id } = await saveStorageRecord({
    fileName: body.file.name,
    path: result.path,
    fileUrl: result.fileUrl,
    createdBy: audit.created_by,
    entityId: body.entityId ?? "",
    entityType: body.entityType as any ?? "otcher",
    meta: body.meta ?? {},
    mimeType: body.file.type,
    size: String(body?.file?.size) || "0",
    tmpId: result.tmpId,
  });

  const event: StorageUploadEvent = {
    url: result.fileUrl,
    tempPath: result.path,
    targetPath: result.fileUrl,
    storageId: id,
    entityType: body.entityType,
    entityId: body.entityId,
    meta: {
      ...body.meta,
      updated_by: audit.updated_by,
      created_by: audit.created_by,
    },
  };


  await publishStorageUpload(event);

  return c.json(result);
});
