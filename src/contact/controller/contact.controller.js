import Contact from "../schema/contact.modal.js";
import { transporter } from "../../config/email.config.js";
import { contactEmailTemplate } from "../../helper/helpers/contactTamplate.js";

// SEND EMAIL
const sendContactEmail = async ({
  firstName,
  lastName,
  email,
  phoneNumber,
  subject,
  message,
}) => {
  return transporter.sendMail({
    from: `"HostInflu Contact" <${process.env.OTP_EMAIL}>`,
    to: process.env.ADMIN_EMAIL,
    replyTo: email,
    subject: `New Contact Message: ${subject}`,
    html: contactEmailTemplate(
      firstName,
      lastName,
      email,
      phoneNumber,
      subject,
      message
    ),
  });
};

// CREATE CONTACT
export const createContact = async (req, res) => {
  try {

    const { firstName, lastName, email, phoneNumber, subject, message } =
      req.body;

    if (!firstName || !lastName || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory",
      });
    }

    // save to DB
    const contact = await Contact.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      subject,
      message,
    });

    // send email
    await sendContactEmail(contact);

    return res.status(201).json({
      success: true,
      message: "Contact submitted successfully",
      data: contact,
    });
  } catch (error) {
    console.error("❌ Contact error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit contact form",
      error: error.message,
    });
  }
};
