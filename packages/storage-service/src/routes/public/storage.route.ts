import { getItemStorageHandler, storageHandler } from "@/controllers/public/storage.controller";
import { checkAccessToken } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate.middleware";
import { getStorageParamSchema, uploadBodySchema } from "@/validator/storage.validator";
import { Hono } from "hono";

const app = new Hono();
app.get("/:bucket/:path", validate({ param: getStorageParamSchema }), getItemStorageHandler);
app.use(checkAccessToken);
app.post("/upload", validate(uploadBodySchema), storageHandler);

export default app;
