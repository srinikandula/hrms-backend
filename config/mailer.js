const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // or use 'smtp.mailtrap.io', 'SendGrid', etc.
  auth: {
    user: process.env.EMAIL_USER,      // your email
    pass: process.env.EMAIL_PASSWORD   // your email password or app password
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      
      from: `"FleetNotify" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
  } catch (error) {
    console.error('Email sending error:', error.message);
  }
};

module.exports = sendEmail;
