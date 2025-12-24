const emailTemplate_verify = (otp) => `
<!DOCTYPE html>
<html>
<body style="font-family:Arial;background:#f4f6f8;padding:20px">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;padding:30px">
    <h2 style="color:#4f46e5">🔐 Hostinflu Password Reset</h2>
    <p>Your One-Time Password (OTP):</p>

    <h1 style="background:#4f46e5;color:#fff;display:inline-block;padding:10px 20px;border-radius:6px">
      ${otp}
    </h1>

    <p>This OTP will expire in <strong>10 minutes</strong>.</p>
    <p style="color:#777;font-size:13px">
      If you did not request this, please ignore this email.
    </p>

    <hr />
    <p style="font-size:12px;color:#999">
      © ${new Date().getFullYear()} Hostinflu
    </p>
  </div>
</body>
</html>
`;

export default emailTemplate_verify;
