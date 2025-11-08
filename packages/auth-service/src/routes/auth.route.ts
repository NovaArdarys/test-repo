import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import {
    forgotPasswordSchema,
    loginSchema,
    refreshTokenSchema,
    registerSchema,
    resetPasswordSchema,
} from '@/validator/auth.validator';
import { logoutHandler } from '@/controllers/logout.controller';
import { refreshHandler } from '@/controllers/refresh.controller';
import { forgotPasswordHandler, resetPasswordHandler } from '@/controllers/password.controller';
import { registerHandler } from '@/controllers/register.controller';
import { checkAccessToken } from '@/middleware/auth.middleware';
import { loginHandler as loginRoute } from '@/controllers/login.controller';


// const { loginHandler, loginValidation } = loginRoute;
const app = new Hono()
    .post('/login', validate({ body: loginSchema }), loginRoute)
    .post('/register', checkAccessToken, validate({ body: registerSchema }), registerHandler) // 👈 hanya di sini
    .post('/refresh', validate({ body: refreshTokenSchema }), refreshHandler)
    .post('/logout', validate({ body: refreshTokenSchema }), logoutHandler)
    .post('/forgot-password', validate({ body: forgotPasswordSchema }), forgotPasswordHandler)
    .post('/reset-password', validate({ body: resetPasswordSchema }), resetPasswordHandler);

export default app;
