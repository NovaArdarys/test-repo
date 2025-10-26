
import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import { refreshTokenSchema, registerSchema, saveTokenSchema, userInfoShema } from '@/validator/user.validator';
import { registerHandler, removeTokenHandler, updatePasswordUserHandler, userInfoHandler, userSaveTokenHandler, validateTokenHandler } from '@/controllers/private/user.controller';

const app = new Hono()
    .post('/user-info', validate(userInfoShema), userInfoHandler)
    .post('/save-token', validate(saveTokenSchema), userSaveTokenHandler)
    .post('/revoke-refresh-token', validate(refreshTokenSchema), removeTokenHandler)
    .post('/validate-refresh-token', validate(refreshTokenSchema), validateTokenHandler)
    .post('/update-password', updatePasswordUserHandler)
    .post('/create-user', validate(registerSchema), registerHandler);

export default app;
