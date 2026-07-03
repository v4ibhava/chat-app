export const getLoginTemplate = (userName, osInfo, ipAddress, date) => {
    const appName = process.env.SMTP_FROM_NAME || "Zync";
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937; line-height: 1.6;">
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #111827;">New Login Detected</h1>
        <p style="margin-top: 0; margin-bottom: 16px;">Hi ${userName},</p>
        <p style="margin-bottom: 16px;">We detected a new login to your ${appName} account.</p>
        
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 14px;">
          <p style="margin: 0 0 8px 0;"><strong>Device/OS:</strong> ${osInfo}</p>
          <p style="margin: 0 0 8px 0;"><strong>IP Address:</strong> ${ipAddress}</p>
          <p style="margin: 0;"><strong>Time:</strong> ${date}</p>
        </div>
        
        <p style="margin-bottom: 24px; color: #ef4444; font-size: 13px;">If this wasn't you, please reset your password immediately to secure your account.</p>
        
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px; margin: 0;">This email was sent by ${appName} to protect your account security.</p>
      </div>
    `;
};
