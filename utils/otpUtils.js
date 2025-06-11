const twilio = require('twilio');
const nodemailer = require('nodemailer');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendOTPWhatsApp = async (no_telepon, otp) => {
    await client.messages.create({
        body: `Kode OTP Anda adalah: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `whatsapp:${no_telepon}`
    });
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const sendOTPEmail = async (email, otp) => {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Kode OTP Anda',
        text: `Kode OTP Anda adalah: ${otp}`
    });
};

const verifyOTP = async (id_pengguna, otp) => {
    // Implementasi verifikasi OTP
};

module.exports = { sendOTPWhatsApp, sendOTPEmail, verifyOTP };