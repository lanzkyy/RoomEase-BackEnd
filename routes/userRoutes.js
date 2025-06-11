// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const UserController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Route untuk mengambil semua user (khusus admin)
router.get('/', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  UserController.getAllUsers
);

// Route untuk menghapus user berdasarkan ID (khusus admin)
router.delete('/:id', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  UserController.deleteUser
);

// Route untuk mengupdate user berdasarkan ID (khusus admin)
router.put('/:id', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  UserController.updateUser
);

// Verifikasi Kata Sandi
router.post('/verify-password', 
  authMiddleware.verifyToken, 
  async (req, res) => {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  const { password } = req.body;
  const userId = req.user.id_pengguna;
  console.log(`[${timestamp} WITA] Attempting to verify password for user ID: ${userId}`);
  console.log(`[${timestamp} WITA] Password received: ${password}`);

  try {
      if (!password) {
          console.log(`[${timestamp} WITA] Password not provided for user ID: ${userId}`);
          return res.status(400).json({ message: 'Password wajib diisi' });
      }

      const [users] = await db.query('SELECT kata_sandi FROM pengguna WHERE id_pengguna = ?', [userId]);
      console.log(`[${timestamp} WITA] Query result for user ID ${userId}:`, users);

      if (users.length === 0) {
          console.log(`[${timestamp} WITA] User not found for ID: ${userId}`);
          return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
      }

      const isMatch = await bcrypt.compare(password, users[0].kata_sandi);
      console.log(`[${timestamp} WITA] Password match result for user ID ${userId}: ${isMatch}`);

      if (!isMatch) {
          console.log(`[${timestamp} WITA] Incorrect password for user ID: ${userId}`);
          return res.status(400).json({ message: 'Kata sandi salah' });
      }

      console.log(`[${timestamp} WITA] Password verified successfully for user ID: ${userId}`);
      res.json({ message: 'Kata sandi terverifikasi' });
  } catch (error) {
      console.error(`[${timestamp} WITA] Error verifying password for user ID ${userId}:`, error);
      res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
});

// Update Profil (email, WhatsApp)
router.post('/update', 
  authMiddleware.verifyToken, 
  async (req, res) => {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  const { email, no_telepon } = req.body;
  const userId = req.user.id_pengguna;
  try {
    await db.query('UPDATE pengguna SET email = ?, no_telepon = ? WHERE id_pengguna = ?', [email, no_telepon, userId]);
    res.json({ message: 'Profil berhasil diperbarui' });
  } catch (error) {
    console.error(`[${timestamp} WITA] Error updating profile:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

// Ganti Kata Sandi
router.post('/change-password', 
  authMiddleware.verifyToken, 
  async (req, res) => {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  const { newPassword } = req.body;
  const userId = req.user.id_pengguna;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE pengguna SET kata_sandi = ? WHERE id_pengguna = ?', [hashedPassword, userId]);
    res.json({ message: 'Kata sandi berhasil diperbarui' });
  } catch (error) {
    console.error(`[${timestamp} WITA] Error changing password:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

// Ambil data pengguna yang sedang login
router.get('/me', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  async (req, res) => {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  const userId = req.user.id_pengguna;

  try {
    const [users] = await db.query('SELECT nama_pengguna, email, no_telepon FROM pengguna WHERE id_pengguna = ?', [userId]);
    if (users.length === 0) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    res.json(users[0]);
  } catch (error) {
    console.error(`[${timestamp} WITA] Error fetching user data:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

module.exports = router;