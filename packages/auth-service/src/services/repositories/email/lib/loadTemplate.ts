import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

export function loadResetTemplate(resetLink: string) {
  const filePath = resolve(__dirname, "../templates/forgot-password.html");

  if (!existsSync(filePath)) {
    throw new Error(`❌ Template file not found: ${filePath}`);
  }

  console.log(filePath);

  let html: string;

  try {
    html = readFileSync(filePath, "utf8");
  } catch (err: any) {
    throw new Error(`❌ Failed to read template file: ${err.message}`);
  }

  html = html.replace(/{{RESET_LINK}}/g, resetLink);

  if (!html.includes(resetLink)) {
    console.warn("⚠️ Warning: RESET_LINK placeholder not found in template");
  }

  return html;
}
