import { generateKeyPairSync } from "crypto";
import * as fs from "fs";
import * as path from "path";

const generateRSA = (kid: string) => {
  const dir = path.resolve("keys");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  fs.writeFileSync(path.join(dir, `${kid}-private.pem`), privateKey);
  fs.writeFileSync(path.join(dir, `${kid}-public.pem`), publicKey);

  console.log(`Generated RSA key with kid=${kid}`);
};

const now = new Date();
const kid = `key-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

generateRSA(kid);
