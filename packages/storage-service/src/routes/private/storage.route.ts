import { getItemStorageHandler, storageHandler } from "@/controllers/public/storage.controller";
import { checkAccessToken } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate.middleware";
import { getStorageParamSchema, uploadBodySchema } from "@/validator/storage.validator";
import { Hono } from "hono";

const app = new Hono();
app.use(checkAccessToken);
app.get("/:bucket/:path", validate({ param: getStorageParamSchema }), getItemStorageHandler);
app.post("/upload", validate(uploadBodySchema),
  storageHandler);

export default app;