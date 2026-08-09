import nodemailer from "nodemailer";
import { getWelcomeTemplate } from "../mailTemplates/welcome.template.js";
import { getLoginTemplate } from "../mailTemplates/login.template.js";
import { getForgotPasswordTemplate } from "../mailTemplates/forgotPassword.template.js";

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

function escapeHTML(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Send Forgot Password OTP Email
export const sendOTPEmail = async (email, otp, userName) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: `🔐 Reset Password - ${process.env.SMTP_FROM_NAME || "Zync"}`,
      html: getForgotPasswordTemplate(escapeHTML(userName), escapeHTML(String(otp))),
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.log("Error sending OTP email:", error.message);
    return false;
  }
};

// Send Welcome Email for New Users
export const sendWelcomeEmail = async (email, userName) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: `🎉 Welcome to ${process.env.SMTP_FROM_NAME || "Zync"}!`,
      html: getWelcomeTemplate(escapeHTML(userName)),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.log("Error sending welcome email:", error.message);
    return false;
  }
};

// Send Login Alert Email
export const sendLoginEmail = async (email, userName, osInfo, ipAddress, date) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: `🛡️ New Login Detected - ${process.env.SMTP_FROM_NAME || "Zync"}`,
      html: getLoginTemplate(
        escapeHTML(userName),
        escapeHTML(osInfo),
        escapeHTML(ipAddress),
        escapeHTML(String(date))
      ),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Login alert email sent to ${email}`);
    return true;
  } catch (error) {
    console.log("Error sending login alert email:", error.message);
    return false;
  }
};
