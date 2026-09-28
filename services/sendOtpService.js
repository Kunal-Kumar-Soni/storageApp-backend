import { Resend } from "resend";
import OTP from "../models/otpModel.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpService = async (email) => {
  const otp = Math.round(1000 + Math.random() * 9000).toString();

  // Upsert OTP (replace if it already exists)
  await OTP.findOneAndUpdate({ email }, { otp, createdAt: Date.now() }, { upsert: true });

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
  </head>
  <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background:#2563eb;padding:24px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;">Email Verification</h1>
      </div>
  
      <!-- Content -->
      <div style="padding:32px;text-align:center;">
        <h2 style="color:#333;margin-bottom:10px;">
          Verify Your Account
        </h2>
  
        <p style="color:#666;font-size:16px;line-height:1.6;">
          Use the OTP below to complete your verification process.
        </p>
  
        <!-- OTP Box -->
        <div style="
          margin:30px auto;
          display:inline-block;
          background:#f3f4f6;
          border:2px dashed #2563eb;
          padding:18px 35px;
          border-radius:10px;
        ">
          <span style="
            font-size:32px;
            font-weight:bold;
            letter-spacing:8px;
            color:#2563eb;
          ">
            ${otp}
          </span>
        </div>
  
        <p style="color:#666;font-size:14px;">
          This OTP is valid for <strong>10 minutes</strong>.
        </p>
  
        <p style="color:#888;font-size:13px;margin-top:25px;">
          If you didn't request this OTP, please ignore this email.
        </p>
      </div>
  
      <!-- Footer -->
      <div style="
        background:#f9fafb;
        padding:16px;
        text-align:center;
        color:#888;
        font-size:12px;
        border-top:1px solid #e5e7eb;
      ">
        © ${new Date().getFullYear()} Storage App. All rights reserved.
      </div>
  
    </div>
  </body>
  </html>
  `;

  await resend.emails.send({
    from: "Storage App <otp@kunalkumarsoni.in>",
    to: email,
    subject: "Storage App OTP",
    html,
  });

  return { success: true, message: `OTP sent successfully on ${email}` };
};
