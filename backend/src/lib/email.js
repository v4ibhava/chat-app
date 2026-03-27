import nodemailer from "nodemailer";

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

// Send OTP Email
export const sendOTPEmail = async (email, otp, userName) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: "Password Reset OTP - Chat App",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p style="color: #666; line-height: 1.6;">
            Hi ${userName},
          </p>
          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password. Please use the OTP below to proceed:
          </p>
          
          <div style="background: #f5f5f5; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h3 style="color: #007bff; margin: 0; text-align: center; font-size: 24px; letter-spacing: 2px;">
              ${otp}
            </h3>
          </div>
          
          <p style="color: #999; font-size: 12px;">
            This OTP will expire in 10 minutes.
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            If you did not request this, please ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2024 Chat App. All rights reserved.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.log("Error sending OTP email:", error.message);
    return false;
  }
};

// Send Welcome Email
export const sendWelcomeEmail = async (email, userName) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: "Welcome to Chat App!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Welcome to Chat App!</h2>
          <p style="color: #666; line-height: 1.6;">
            Hi ${userName},
          </p>
          <p style="color: #666; line-height: 1.6;">
            Your account has been successfully created. You can now start chatting with your friends!
          </p>
          
          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 4px; text-align: center;">
            <a href="${process.env.FRONTEND_URL}" style="display: inline-block; background: #007bff; color: white; padding: 10px 30px; text-decoration: none; border-radius: 4px;">
              Go to Chat App
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Happy chatting!
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2024 Chat App. All rights reserved.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.log("Error sending welcome email:", error.message);
    return false;
  }
};
