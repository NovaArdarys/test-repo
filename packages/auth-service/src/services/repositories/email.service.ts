import { emailConfig } from '@/constants/config';
import * as nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport(emailConfig);

export const sendEmail = async (type: string, to: string, data: Record<string, any>) => {
  let subject, text;

  switch (type) {
    case 'confirmation':
      subject = 'Email Confirmation';
      text = `Please confirm your email by clicking this link: ${data.confirmationLink}`;
      break;

    case 'otp':
      subject = 'Your OTP Code';
      text = `Your OTP code is: ${data.otpCode}`;
      break;

    case 'reset-password':
      subject = 'Reset Your Password';
      text = `Click this link to reset your password: ${data.resetLink}`;
      break;

    default:
      throw new Error('Unknown email type');
  }

  try {
    const info = await transporter.sendMail({
      from: '"Your App" <alexis.nova.hartley@ptn-techlabs.com>',
      to,
      subject,
      text,
      html: `<p>${text}</p><p><a href="${data.resetLink}">Reset Password</a></p>`
    });

    console.log("Email sent:", info.messageId, JSON.stringify(info));
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("Email failed:", err);
    return { success: false, error: err };
  }
};
