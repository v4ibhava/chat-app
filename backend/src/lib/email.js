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
      subject: "🔐 Password Reset Code - Chat App",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <div style="background: #007bff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
              Hi <strong>${userName}</strong>,
            </p>
            
            <p style="color: #666; line-height: 1.8; margin: 0 0 20px 0;">
              You requested to reset your password. Use the code below to create a new password:
            </p>
            
            <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center;">
              <p style="color: white; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
              <h2 style="color: white; margin: 0; font-size: 44px; letter-spacing: 5px; font-weight: bold;">
                ${otp}
              </h2>
            </div>
            
            <p style="color: #999; font-size: 13px; text-align: center; margin: 20px 0;">
              ⏱️ This code will expire in <strong>10 minutes</strong>
            </p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #856404; margin: 0; font-size: 13px;">
                <strong>⚠️ Security Tip:</strong> Never share this code with anyone. We will never ask for your code.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.8; margin: 20px 0; font-size: 13px;">
              If you didn't request this code, please ignore this email or <a href="${process.env.FRONTEND_URL}/contact" style="color: #007bff; text-decoration: none;">contact support</a>.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <div style="text-align: center; color: #999; font-size: 12px;">
              <p style="margin: 5px 0;">Chat App Support Team</p>
              <p style="margin: 5px 0;">© 2024 ${process.env.SMTP_FROM_NAME}. All rights reserved.</p>
            </div>
          </div>
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
      subject: "🎉 Welcome to Chat App!",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🎉 Welcome!</h1>
            <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 16px;">You're officially part of Chat App</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
              Hi <strong>${userName}</strong>,
            </p>
            
            <p style="color: #666; line-height: 1.8; margin: 0 0 20px 0;">
              Congratulations! Your account has been successfully created. You're now ready to connect and chat with friends.
            </p>
            
            <div style="background: #e3f2fd; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #1565c0; margin: 0; font-weight: 500;">
                ✨ What's next?
              </p>
              <ul style="color: #1565c0; margin: 10px 0 0 20px; padding: 0;">
                <li>Set up your profile picture</li>
                <li>Start chatting with friends</li>
                <li>Explore our amazing features</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${process.env.FRONTEND_URL}" style="display: inline-block; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                🚀 Go to Chat App
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.8; margin: 25px 0; font-size: 14px;">
              If you have any questions or need help, feel free to <a href="${process.env.FRONTEND_URL}/contact" style="color: #007bff; text-decoration: none;">contact our support team</a>.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <div style="text-align: center; color: #999; font-size: 12px;">
              <p style="margin: 5px 0;">Happy chatting! 💬</p>
              <p style="margin: 5px 0;">The Chat App Team</p>
              <p style="margin: 10px 0 0 0;">© 2024 ${process.env.SMTP_FROM_NAME}. All rights reserved.</p>
            </div>
          </div>
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
