//controllers/otpController.js

const db = require('../config/db');
const axios = require('axios');
require('dotenv').config();

class OtpController {
    static async sendOtp(req, res) {
        let { no_telepon } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        try {
            let normalizedNoTelepon = no_telepon;
            if (no_telepon.startsWith('+')) {
                normalizedNoTelepon = no_telepon.replace('+', '');
            }

            const [user] = await db.query('SELECT * FROM pengguna WHERE no_telepon = ?', [normalizedNoTelepon]);
            if (!user.length) {
                return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
            }

            await db.query(
                'UPDATE pengguna SET otp = ?, otp_expiry = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE no_telepon = ?',
                [otp, normalizedNoTelepon]
            );

            const response = await axios.post(
                'https://api.fonnte.com/send',
                {
                    target: normalizedNoTelepon,
                    message: `Kode OTP Anda adalah: ${otp}. Jangan bagikan kode ini kepada siapapun. Berlaku selama 10 menit.`,
                    countryCode: '62'
                },
                {
                    headers: {
                        'Authorization': process.env.FONNTE_TOKEN
                    }
                }
            );

            console.log(`OTP dikirim: ${JSON.stringify(response.data)}`);
            res.status(200).json({ message: 'OTP berhasil dikirim via WhatsApp' });
        } catch (err) {
            console.error('Error saat mengirim OTP:', err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.message || 'Gagal mengirim OTP ke WhatsApp';
            res.status(500).json({ message: errorMessage });
        }
    }

    static async verifyOtp(req, res) {
        let { no_telepon, otp } = req.body;

        try {
            let normalizedNoTelepon = no_telepon;
            if (no_telepon.startsWith('+')) {
                normalizedNoTelepon = no_telepon.replace('+', '');
            }

            const [user] = await db.query(
                'SELECT otp, otp_expiry FROM pengguna WHERE no_telepon = ?',
                [normalizedNoTelepon]
            );
            if (!user.length) {
                return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
            }

            const currentTime = new Date();
            const otpExpiry = new Date(user[0].otp_expiry);

            if (!user[0].otp || currentTime > otpExpiry) {
                return res.status(400).json({ message: 'OTP sudah kedaluwarsa atau tidak ada' });
            }
            if (user[0].otp !== otp) {
                return res.status(400).json({ message: 'OTP salah' });
            }

            await db.query(
                'UPDATE pengguna SET otp = NULL, otp_expiry = NULL WHERE no_telepon = ?',
                [normalizedNoTelepon]
            );

            res.status(200).json({ message: 'OTP valid' });
        } catch (err) {
            console.error('Error saat memverifikasi OTP:', err);
            res.status(500).json({ message: 'Gagal memverifikasi OTP' });
        }
    }
}

module.exports = OtpController;