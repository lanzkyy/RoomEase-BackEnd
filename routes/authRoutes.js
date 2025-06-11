// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', async (req, res) => {
  try {
    const { nama_pengguna, kata_sandi, peran, no_telepon, email } = req.body;
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

    if (!nama_pengguna || !kata_sandi || !peran) {
      return res.status(400).json({ message: 'Nama pengguna, kata sandi, dan peran wajib diisi.' });
    }

    const existingUser = await User.findByNamaPengguna(nama_pengguna);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Nama pengguna sudah digunakan.' });
    }

    const hashedPassword = await bcrypt.hash(kata_sandi, 10);
    await User.create({ nama_pengguna, kata_sandi: hashedPassword, peran, no_telepon, email });

    console.log(`[${timestamp} WITA] Pengguna terdaftar:`, nama_pengguna);
    res.status(201).json({ message: 'Pengguna berhasil didaftarkan.' });
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Gagal mendaftarkan pengguna:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

router.post('/register-by-admin', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo('admin'), 
  async (req, res) => {
  try {
    const { nama_pengguna, kata_sandi, peran, no_telepon, email, id_kelas } = req.body;
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

    if (!nama_pengguna || !kata_sandi || !peran || !no_telepon || !email || !id_kelas) {
      return res.status(400).json({ message: 'Semua field harus diisi.' });
    }

    if (peran !== 'admin' && !['ketua', 'sekretaris'].includes(peran)) {
      return res.status(400).json({ message: 'Peran harus ketua atau sekretaris untuk registrasi oleh admin.' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail.length > 0) {
      console.log(`[${timestamp} WITA] Email already registered:`, email);
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    const normalizedNoTelepon = no_telepon.replace(/[\s+]/g, '');
    const existingPhone = await User.findByPhone(normalizedNoTelepon);
    if (existingPhone.length > 0) {
      console.log(`[${timestamp} WITA] Phone number already registered:`, normalizedNoTelepon);
      return res.status(400).json({ message: 'Nomor telepon sudah terdaftar' });
    }

    const kelas = await User.findClassById(id_kelas);
    if (kelas.length === 0) {
      console.log(`[${timestamp} WITA] Class not found:`, id_kelas);
      return res.status(400).json({ message: 'Kelas tidak ditemukan' });
    }

    const hashedPassword = await bcrypt.hash(kata_sandi, 10);
    const newUser = await User.create({
      nama_pengguna,
      kata_sandi: hashedPassword,
      peran,
      no_telepon: normalizedNoTelepon,
      email,
      id_kelas,
    });

    console.log(`[${timestamp} WITA] User created by admin:`, { id: newUser.insertId, nama_pengguna, email });
    res.status(201).json({ message: 'Pengguna berhasil dibuat oleh admin' });
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Error in registerByAdmin:`, error.message);
    res.status(500).json({ message: 'Gagal mendaftar pengguna', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, kata_sandi } = req.body;
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

    if (!email || !kata_sandi) {
      return res.status(400).json({ message: 'Email dan kata sandi wajib diisi.' });
    }

    const users = await User.findByEmail(email);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Email atau kata sandi salah.' });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(kata_sandi, user.kata_sandi);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email atau kata sandi salah.' });
    }

    // Pastikan id_kelas ada, gunakan null jika tidak ada
    const id_kelas = user.id_kelas || null;

    // Validasi tambahan untuk ketua/sekretaris
    if (['ketua', 'sekretaris'].includes(user.peran) && !id_kelas) {
      return res.status(400).json({ message: 'Akun ketua/sekretaris harus terkait dengan kelas.' });
    }

    const token = jwt.sign(
      { id_pengguna: user.id_pengguna, peran: user.peran, id_kelas },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(`[${timestamp} WITA] Pengguna berhasil login:`, email, { id_kelas });
    res.status(200).json({ token, peran: user.peran, id_kelas });
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Gagal login:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

router.get('/profile', 
  authMiddleware.verifyToken, 
  async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    const user = await User.findById(req.user.id_pengguna);

    if (!user) {
      console.log(`[${timestamp} WITA] Pengguna tidak ditemukan untuk id_pengguna:`, req.user.id_pengguna);
      return res.status(404).json({ message: 'Pengguna tidak ditemukan. Silakan login ulang.' });
    }

    console.log(`[${timestamp} WITA] Berhasil mengambil profil untuk pengguna ${user.id_pengguna}`);
    res.status(200).json({
      id_pengguna: user.id_pengguna,
      nama_pengguna: user.nama_pengguna,
      peran: user.peran,
      id_kelas: user.id_kelas,
      email: user.email,
      no_telepon: user.no_telepon,
      id_prodi: user.id_prodi,
      semester: user.semester,
    });
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Gagal mengambil profil pengguna:`, error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token telah kadaluarsa. Silakan login ulang.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Token tidak valid. Silakan login lagi.' });
    }
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;