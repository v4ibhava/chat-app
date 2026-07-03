export const getForgotPasswordTemplate = (userName, otp) => {
    const appName = process.env.SMTP_FROM_NAME || "Zync";
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937; line-height: 1.6;">
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #111827;">Reset Password</h1>
        <p style="margin-top: 0; margin-bottom: 16px;">Hi ${userName},</p>
        <p style="margin-bottom: 16px;">Use the code below to complete your password reset request. This code will expire in 10 minutes.</p>
        
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #111827;">${otp}</span>
        </div>
        
        <p style="margin-bottom: 24px; color: #ef4444; font-size: 13px;">Never share this code with anyone. We will never ask for it.</p>
        
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px; margin: 0;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `;
};
