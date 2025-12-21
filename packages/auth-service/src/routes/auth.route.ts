import { Hono } from 'hono';
import { validate } from '@/middleware/validate.middleware';
import {
    ForgotPasswordSchema,
    LoginSchema,
    RefreshTokenSchema,
    RegisterSchema,
    ResetPasswordSchema,
} from '@/validator/auth.validator';
import { logoutHandler } from '@/controllers/logout.controller';
import { refreshHandler } from '@/controllers/refresh.controller';
import { forgotPasswordHandler, resetPasswordHandler } from '@/controllers/password.controller';
import { registerHandler } from '@/controllers/register.controller';
import { checkAccessToken } from '@/middleware/auth.middleware';
import { loginHandler } from '@/controllers/login.controller';


// const { loginHandler, loginValidation } = loginRoute;
const app = new Hono()
    .post('/login', validate({ body: LoginSchema }), loginHandler)
    .post('/refresh', validate({ body: RefreshTokenSchema }), refreshHandler)
    .post('/logout', validate({ body: RefreshTokenSchema }), logoutHandler)
    .post('/forgot-password', validate({ body: ForgotPasswordSchema }), forgotPasswordHandler)
    .post('/reset-password', validate({ body: ResetPasswordSchema }), resetPasswordHandler)
    .post('/register', checkAccessToken, validate({ body: RegisterSchema }), registerHandler);

export default app;
