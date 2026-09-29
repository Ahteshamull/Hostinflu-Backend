const registrationEmailTemplate = (otp, userName = "User") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Hostinflu</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 30px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">✨ Welcome to Hostinflu</h1>
      <p style="margin: 8px 0 0 0; font-size: 15px; opacity: 0.9;">Verify your email to activate your account</p>
    </div>

    <!-- Body Content -->
    <div style="padding: 36px 30px; color: #333333; line-height: 1.6;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1e1b4b;">Hello ${userName},</h2>
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #4b5563;">
        Thank you for joining Hostinflu! To complete your registration and secure your account, please verify your email address using the 6-digit verification code below:
      </p>

      <!-- OTP Box -->
      <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 24px; text-align: center; margin: 28px 0;">
        <span style="display: block; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 600; margin-bottom: 8px;">Your 6-Digit Verification Code</span>
        <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; font-family: monospace;">
          ${otp}
        </div>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #e11d48; font-weight: 500;">
          ⏱️ This OTP code is valid for 10 minutes only.
        </p>
      </div>

      <!-- Security Notice -->
      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: #92400e;">
          <strong>Security Note:</strong> Never share this verification code with anyone. Hostinflu team will never ask for your OTP.
        </p>
      </div>

      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        If you didn't create an account with Hostinflu, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 13px; color: #9ca3af;">
        © ${new Date().getFullYear()} Hostinflu. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
`;

export default registrationEmailTemplate;
