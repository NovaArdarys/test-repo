import { publishStorageUpload, StorageUploadEvent } from "@/messaging/publishers/storage.publisher";
import { saveStorageRecord } from "@/services/repositories/storage.service";
import { catchAsync } from "@/utils/catchAsync";
import { uploadToMinio } from "@/utils/minioClient";
import { uploadBodySchema, uploadBodyType } from "@/validator/storage.validator";
import { Context } from "hono";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  domain: c.get('domain'),
  subDomain: c.get('subDomain'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date(),
  isAppManager: c.get("isAppManager") as boolean,
});


export const storageHandler = catchAsync(async (c) => {
  const body = (await c.req.parseBody()) as unknown as uploadBodyType;
  const audit = getAuditFields(c);

  const files = Array.isArray(body.file) ? body.file : [body.file!];

  if (!files || files.length === 0) {
    return c.json({ message: "No file uploaded" }, 400);
  }

  const results = await Promise.all(
    files?.map(async (file) => {
      const result = await uploadToMinio(file, "temporary");

      const { id } = await saveStorageRecord({
        fileName: file.name,
        path: result.path,
        fileUrl: result.fileUrl,
        createdBy: audit.createdBy,
        entityId: body?.entityId,
        entityType: (body.entityType as any) ?? "other",
        meta: body.meta ?? {},
        mimeType: file.type,
        size: String(file.size || "0"),
        tmpId: result?.tmpId,
      });

      const event: StorageUploadEvent = {
        url: result.fileUrl,
        tempPath: result.path,
        targetPath: result.fileUrl,
        storageId: id,
        entityType: body.entityType,
        entityId: body?.entityId,
        meta: {
          ...body.meta,
          updated_by: audit.updatedBy,
          created_by: audit.createdBy,
        },
      };

      if (event.entityId && event.entityType) {
        await publishStorageUpload(event);
      }

      return {
        id,
        fileName: file.name,
        url: result.fileUrl,
        path: result.path,
        mimeType: file.type,
        size: file.size,
      };
    }),
  );

  return c.json(results.length === 1 ? results[0] : results);
});

