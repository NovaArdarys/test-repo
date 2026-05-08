import { emailConfig } from '@/constants/config';
import * as nodemailer from 'nodemailer';
import { loadResetTemplate } from './lib/loadTemplate';
import type { EmailJob } from '@/jobs/types/email.type';

const transporter = nodemailer.createTransport(emailConfig);

export const sendEmail = async ({ type, to, data }: EmailJob) => {
  console.log(emailConfig, "=====smtp-config======");

  let subject = "";
  let html = "";
  let text = "";

  switch (type) {

    case "forgot-password":
      subject = "Atur Ulang Kata Sandi";
      html = loadResetTemplate(data.resetLink);
      text = `Gunakan link berikut untuk reset password: ${data.resetLink}`;
      break;

    case "reset-password":
      subject = "Password Berhasil Diubah";
      text = `Password Anda berhasil direset.${data.username ? ` Hai ${data.username}!` : ""}`;
      html = `<p>Password Anda berhasil direset.${data.username ? ` Hai <b>${data.username}</b>!` : ""}</p>`;
      break;

    case "confirmation":
      subject = "Konfirmasi Email Anda";
      text = `Klik link berikut untuk konfirmasi email Anda: ${data.confirmationLink}`;
      html = `<p>Klik link berikut untuk konfirmasi email Anda:</p><a href="${data.confirmationLink}">${data.confirmationLink}</a>`;
      break;

    case "otp":
      subject = "Kode OTP Anda";
      text = `Kode OTP Anda adalah: ${data.otpCode}`;
      html = `<p>Kode OTP Anda adalah: <b>${data.otpCode}</b></p>`;
      break;
  }

  const info = await transporter.sendMail({
    from: `"MBG" <${process.env.EMAIL_USER || 'your-email@example.com'}>`,
    to,
    subject,
    text,
    html,
  });

  return info;
};
