import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// 🔐 Safety check
if (!process.env.OTP_EMAIL || !process.env.OTP_PASSWORD) {
  throw new Error(
    "❌ OTP_EMAIL or OTP_PASSWORD missing. Check dotenv load order.",
  );
}

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.OTP_EMAIL,
    pass: process.env.OTP_PASSWORD,
  },
});

// verify on server start
transporter.verify((error) => {
  if (error) {
    console.error("❌ Email config error:", error.message);
  } else {
    console.log("📩 Email server ready");
  }
});

// Send email function
export const sendEmail = async ({ email, subject, message }) => {
  try {
    const mailOptions = {
      from: process.env.OTP_EMAIL,
      to: email,
      subject: subject,
      text: message,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Failed to send email");
  }
};
