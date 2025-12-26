export const contactEmailTemplate = (
  firstName,
  lastName,
  email,
  phoneNumber,
  subject,
  message
) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>New Contact Message</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f5f7;font-family:Arial,Helvetica,sans-serif;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f5f7;padding:30px 0;">
    <tr>
      <td align="center">

        <!-- MAIN CARD -->
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 8px 25px rgba(0,0,0,0.08);">
          
          <!-- HEADER -->
          <tr>
            <td style="background:#2563eb;padding:24px;text-align:center;color:#ffffff;">
              <h2 style="margin:0;font-size:22px;">📩 New Contact Form Message</h2>
              <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">
                You received a new inquiry from your website
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:30px;color:#333333;">

              <!-- USER INFO -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="font-size:14px;padding-bottom:6px;color:#6b7280;">Name</td>
                </tr>
                <tr>
                  <td style="font-size:16px;font-weight:600;">${firstName} ${lastName}</td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="font-size:14px;padding-bottom:6px;color:#6b7280;">Email</td>
                </tr>
                <tr>
                  <td style="font-size:16px;">
                    <a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">
                      ${email}
                    </a>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="font-size:14px;padding-bottom:6px;color:#6b7280;">Phone</td>
                </tr>
                <tr>
                  <td style="font-size:16px;">${
                    phoneNumber || "Not provided"
                  }</td>
                </tr>
              </table>

              <!-- SUBJECT -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:25px;">
                <tr>
                  <td style="font-size:14px;padding-bottom:6px;color:#6b7280;">Subject</td>
                </tr>
                <tr>
                  <td style="font-size:16px;font-weight:600;">${subject}</td>
                </tr>
              </table>

              <!-- MESSAGE BOX -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-left:4px solid #2563eb;border-radius:6px;">
                <tr>
                  <td style="padding:18px;font-size:15px;line-height:1.6;color:#374151;">
                    ${message.replace(/\n/g, "<br/>")}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f9fafb;padding:20px;text-align:center;font-size:13px;color:#6b7280;">
              <p style="margin:0;">This message was sent from Hostinflu website contact form.</p>
              <p style="margin:6px 0 0;">
                Received on ${new Date().toLocaleString()}
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
};
