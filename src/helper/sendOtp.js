import nodemailer from "nodemailer";

class SendOtp {
  constructor() {
    this.transporter = null;
  }

  getTransporter() {
    // Lazy load transporter to ensure env variables are loaded
    if (!this.transporter) {
      const emailConfig = this.getEmailConfig();
      this.transporter = nodemailer.createTransport(emailConfig);
    }
    return this.transporter;
  }

  getEmailConfig() {
    const service = process.env.EMAIL_SERVICE || "gmail";

    // Clean up password (remove spaces if any)
    const emailPassword = (
      process.env.OTP_PASSWORD ||
      process.env.EMAIL_PASSWORD ||
      ""
    ).replace(/\s+/g, "");
    const emailUser = process.env.OTP_EMAIL || process.env.EMAIL_USER;

    // Debug logging
    console.log("📧 Email Configuration Debug:");
    console.log("- Service:", service);
    console.log(
      "- Email User:",
      emailUser ? `${emailUser.substring(0, 3)}***` : "NOT SET"
    );
    console.log(
      "- Email Password:",
      emailPassword ? `${emailPassword.substring(0, 4)}***` : "NOT SET"
    );

    if (!emailUser || !emailPassword) {
      console.error("❌ ERROR: Email credentials are missing!");
      console.error("Please set OTP_EMAIL and OTP_PASSWORD in your .env file");
    }

    if (service && service !== "custom") {
      // Use predefined service (gmail, outlook, yahoo, etc.)
      return {
        service: service,
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      };
    } else {
      // Use custom SMTP configuration
      return {
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === "true" || false, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      };
    }
  }

  // Test email configuration
  async testConnection() {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      console.log("✅ Email service is configured correctly");
      return { success: true, message: "Email service connected successfully" };
    } catch (error) {
      console.error("❌ Email service configuration error:", error);
      return { success: false, error: error.message };
    }
  }

  // Send test email
  async sendTestEmail(toEmail) {
    try {
      const transporter = this.getTransporter();
      const result = await transporter.sendMail({
        from:
          process.env.EMAIL_FROM ||
          process.env.OTP_EMAIL ||
          process.env.EMAIL_USER,
        to: toEmail,
        subject: "Test Email - Dalil Arehan",
        html: `
          <h2>🎉 Email Configuration Test</h2>
          <p>If you receive this email, your Nodemailer configuration is working correctly!</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <hr>
          <p><small>This is a test email from Dalil Arehan backend service.</small></p>
        `,
      });

      console.log("✅ Test email sent successfully:", result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Failed to send test email:", error);
      return { success: false, error: error.message };
    }
  }

  async sendOTPEmail(email, otp, userName = "User") {
    const mailOptions = {
      from:
        process.env.EMAIL_FROM ||
        process.env.OTP_EMAIL ||
        process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP - Flexitech",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset OTP</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 300;
            }
            .content {
              padding: 40px 30px;
            }
            .otp-box {
              background: #f8f9fa;
              border: 2px dashed #667eea;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              color: #667eea;
              letter-spacing: 5px;
              font-family: 'Courier New', monospace;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
              color: #856404;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px 30px;
              text-align: center;
              color: #6c757d;
              font-size: 14px;
            }
            .btn {
              display: inline-block;
              padding: 12px 25px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>We received a request to reset your password for your Flexitech account.</p>
 
              <div class="otp-box">
                <p><strong>Your OTP Code:</strong></p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
                  This code expires in 10 minutes
                </p>
              </div>
 
              <p>Please enter this OTP code in the password reset form to continue.</p>
 
              <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                • Never share this OTP with anyone<br>
                • This code expires in 10 minutes<br>
                • If you didn't request this reset, please ignore this email
              </div>
 
              <p>If you're having trouble, contact our support team.</p>
            </div>
            <div class="footer">
              <p>This is an automated email from Flexitech</p>
              <p>© ${new Date().getFullYear()} Flexitech. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset OTP - Flexitech
 
Hello ${userName}!
 
We received a request to reset your password for your Flexitech account.
 
Your OTP Code: ${otp}
 
This code expires in 10 minutes.
 
Please enter this OTP code in the password reset form to continue.
 
Security Notice:
- Never share this OTP with anyone
- This code expires in 10 minutes
- If you didn't request this reset, please ignore this email
 
© ${new Date().getFullYear()} Dalil Arehan. All rights reserved.
      `,
    };

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log("OTP email sent successfully:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      throw new Error("Failed to send OTP email");
    }
  }

  async sendPasswordResetConfirmation(email, userName = "User") {
    const mailOptions = {
      from:
        process.env.EMAIL_FROM ||
        process.env.OTP_EMAIL ||
        process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Successful - Dalil Arehan",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Successful</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #00b894 0%, #00a085 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 300;
            }
            .content {
              padding: 40px 30px;
            }
            .success-box {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
              color: #155724;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px 30px;
              text-align: center;
              color: #6c757d;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Password Reset Successful</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>Your password has been successfully reset for your Flexitech account.</p>
 
              <div class="success-box">
                <h3>🎉 All Done!</h3>
                <p>You can now log in with your new password.</p>
              </div>
 
              <p>If you didn't make this change, please contact our support team immediately.</p>
 
              <p>For your security, we recommend:</p>
              <ul>
                <li>Using a strong, unique password</li>
                <li>Enabling two-factor authentication if available</li>
                <li>Logging out of all devices and logging back in</li>
              </ul>
            </div>
            <div class="footer">
              <p>This is an automated email from Dalil Arehan</p>
              <p>© ${new Date().getFullYear()} Dalil Arehan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset Successful - Dalil Arehan
 
Hello ${userName}!
 
Your password has been successfully reset for your Flexitech account.
 
You can now log in with your new password.
 
If you didn't make this change, please contact our support team immediately.
 
For your security, we recommend:
- Using a strong, unique password
- Enabling two-factor authentication if available
- Logging out of all devices and logging back in
 
© ${new Date().getFullYear()} Dalil Arehan. All rights reserved.
      `,
    };

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log(
        "Password reset confirmation email sent successfully:",
        info.messageId
      );
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Failed to send confirmation email:", error);
      throw new Error("Failed to send confirmation email");
    }
  }
}

export default new SendOtp();
