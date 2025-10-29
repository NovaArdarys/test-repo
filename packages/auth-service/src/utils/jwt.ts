import * as jwt from 'jsonwebtoken';
import * as fs from "fs";
import * as path from "path";
import { exportJWK, importSPKI, VerifyOptions } from 'jose';

export interface tokenParams {
  email: string;
  national_id?: string;
  id: string;
  roleId: string;
  data?: Record<string, any>;
}
// load keys
const keysDir = path.join(__dirname, "../keys");
const keys = fs.readdirSync(keysDir)
  .filter(f => f.endsWith("private.pem"))
  .map(f => {
    const kid = f.split("-private.pem")[0];
    return {
      kid,
      privateKey: fs.readFileSync(path.join(keysDir, f), "utf8"),
      publicKey: fs.readFileSync(path.join(keysDir, `${kid}-public.pem`), "utf8"),
    };
  });

const currentKey = keys.sort((a, b) => (a.kid < b.kid ? -1 : 1)).pop();

export const jwks = async () => {
  const jwks = await Promise.all(
    keys.map(async k => {
      const jwk = await exportJWK(await importSPKI(k.publicKey, "RS256"));
      return {
        ...jwk,
        kid: k.kid,
        use: "sig",
        alg: "RS256",
        kty: "RSA"
      };
    })
  );

  return jwks;
};

//Access Token (1 hari)
export const generateToken = async ({ email, id, roleId, data = {} }: tokenParams) => {
  const payload = {
    id,
    email,
    roleId,
    data,
    type: 'access', // tandai token ini access token
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 1 hari
  };
  const token = await jwt.sign(payload, currentKey!.privateKey, {
    algorithm: "RS256",
    keyid: currentKey!.kid,
  });

  return token;
};

// Refresh Token (30 hari)
export const generateRefreshToken = async ({ email, national_id, id, roleId }: tokenParams) => {
  const tmpExp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const payload = {
    id,
    email,
    national_id,
    roleId,
    type: 'refresh',
    exp: tmpExp
  };
  const token = await jwt.sign(payload, currentKey!.privateKey, {
    algorithm: "RS256",
    keyid: currentKey!.kid,
  });

  return { token, tmpExp };
};

export const verifyToken = async (token: string) => {
  const result = await jwt.verify(token, currentKey!.privateKey, {
    algorithms: ["RS256"],
    allowInvalidAsymmetricKeyTypes: true,
  });

  return result;
};

export const decodeToken = async (token: string): Promise<Record<any, any>> => {
  const result = await jwt.decode(token, {
    json: true
  });

  return result || {};
};


// Token reset password (1 jam)
export interface ResetTokenParams {
  email: string;
  id: string;
}

export const generateResetToken = async ({ email, id }: ResetTokenParams) => {
  const payload = {
    id,
    email,
    type: 'reset-password',
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };

  const token = await jwt.sign(payload, currentKey!.privateKey, {
    algorithm: "RS256",
    keyid: currentKey!.kid,
  });

  return token;
};

export const verifyResetToken = async (token: string) => {
  try {
    const result = await jwt.verify(token, currentKey!.privateKey, {
      algorithms: ["RS256"],
      allowInvalidAsymmetricKeyTypes: true,
    });

    if ((result as any).type !== 'reset-password') {
      throw new Error('Invalid token type');
    }

    return result;
  } catch (err) {
    throw new Error('Invalid or expired reset token');
  }
};