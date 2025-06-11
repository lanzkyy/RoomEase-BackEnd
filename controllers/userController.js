// controllers/userController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const UserController = {
  // Fungsi untuk mengambil semua user
  getAllUsers: async (req, res) => {
    try {
      const [users] = await db.query(`
        SELECT u.id_pengguna, u.nama_pengguna, u.email, u.no_telepon, u.peran, k.nama_kelas, u.id_kelas
        FROM pengguna u
        LEFT JOIN kelas k ON u.id_kelas = k.id_kelas
        WHERE u.peran IN ('ketua', 'sekretaris')
      `);
      console.log(`[${new Date().toISOString()}] Users fetched:`, users);
      res.status(200).json(users);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching users:`, error);
      res.status(500).json({ message: 'Gagal mengambil daftar user.' });
    }
  },

  // Fungsi untuk menghapus user berdasarkan ID
  deleteUser: async (req, res) => {
    const { id } = req.params;

    try {
      const [user] = await db.query('SELECT * FROM pengguna WHERE id_pengguna = ?', [id]);
      if (user.length === 0) {
        console.log(`[${new Date().toISOString()}] User not found with ID:`, id);
        return res.status(404).json({ message: 'User tidak ditemukan.' });
      }

      // Hapus user dari database
      await db.query('DELETE FROM pengguna WHERE id_pengguna = ?', [id]);
      console.log(`[${new Date().toISOString()}] User deleted with ID:`, id);
      res.status(200).json({ message: 'User berhasil dihapus.' });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error deleting user:`, error);
      res.status(500).json({ message: 'Gagal menghapus user.' });
    }
  },

  // Fungsi untuk mengupdate user berdasarkan ID
  updateUser: async (req, res) => {
    const { id } = req.params;
    const { nama_pengguna, email, no_telepon, peran, id_kelas } = req.body;

    try {
      // Periksa apakah user ada
      const [user] = await db.query('SELECT * FROM pengguna WHERE id_pengguna = ?', [id]);
      if (user.length === 0) {
        console.log(`[${new Date().toISOString()}] User not found with ID:`, id);
        return res.status(404).json({ message: 'User tidak ditemukan.' });
      }

      // Validasi peran
      const allowedRoles = ['ketua', 'sekretaris'];
      if (!allowedRoles.includes(peran)) {
        console.log(`[${new Date().toISOString()}] Invalid role:`, peran);
        return res.status(400).json({ message: 'Peran tidak valid. Hanya ketua atau sekretaris yang diizinkan.' });
      }

      // Validasi id_kelas
      if (!id_kelas) {
        console.log(`[${new Date().toISOString()}] Missing id_kelas for user ID:`, id);
        return res.status(400).json({ message: 'ID kelas harus diisi untuk peran ketua atau sekretaris.' });
      }

      // Periksa apakah kelas ada
      const [kelas] = await db.query('SELECT * FROM kelas WHERE id_kelas = ?', [id_kelas]);
      if (kelas.length === 0) {
        console.log(`[${new Date().toISOString()}] Class not found with ID:`, id_kelas);
        return res.status(400).json({ message: 'Kelas tidak ditemukan.' });
      }

      // Periksa apakah email sudah digunakan oleh user lain
      const [existingEmail] = await db.query('SELECT * FROM pengguna WHERE email = ? AND id_pengguna != ?', [email, id]);
      if (existingEmail.length > 0) {
        console.log(`[${new Date().toISOString()}] Email already used:`, email);
        return res.status(400).json({ message: 'Email sudah digunakan oleh user lain.' });
      }

      // Periksa apakah nomor telepon sudah digunakan oleh user lain
      const [existingPhone] = await db.query('SELECT * FROM pengguna WHERE no_telepon = ? AND id_pengguna != ?', [no_telepon, id]);
      if (existingPhone.length > 0) {
        console.log(`[${new Date().toISOString()}] Phone number already used:`, no_telepon);
        return res.status(400).json({ message: 'Nomor telepon sudah digunakan oleh user lain.' });
      }

      // Update user di database
      await db.query(
        'UPDATE pengguna SET nama_pengguna = ?, email = ?, no_telepon = ?, peran = ?, id_kelas = ? WHERE id_pengguna = ?',
        [nama_pengguna, email, no_telepon, peran, id_kelas, id]
      );
      console.log(`[${new Date().toISOString()}] User updated with ID:`, id);
      res.status(200).json({ message: 'User berhasil diperbarui.' });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating user:`, error);
      res.status(500).json({ message: 'Gagal mengupdate user.' });
    }
  }
};

module.exports = UserController;