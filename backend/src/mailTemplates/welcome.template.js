export const getWelcomeTemplate = (userName) => {
    const appName = process.env.SMTP_FROM_NAME || "Zync";
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937; line-height: 1.6;">
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #111827;">Welcome to ${appName}!</h1>
        <p style="margin-top: 0; margin-bottom: 16px;">Hi ${userName},</p>
        <p style="margin-bottom: 24px;">Your account has been successfully created. You can now log in and connect with your friends.</p>
        
        <div style="margin-bottom: 24px;">
          <a href="${process.env.FRONTEND_URL}" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
            Launch App
          </a>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px; margin: 0;">This email was sent by ${appName}. If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `;
};
