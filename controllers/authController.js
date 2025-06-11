// controllers/authController.js

const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthController {
  // Login
  static async login(req, res) {
    const { email, kata_sandi } = req.body;

    try {
      console.log('Mencoba login untuk email:', email);
      const [users] = await db.query('SELECT * FROM pengguna WHERE email = ?', [email]);

      if (users.length === 0) {
        console.log('Email tidak ditemukan:', email);
        return res.status(401).json({ message: 'Email tidak ditemukan' });
      }

      const user = users[0];
      console.log('Pengguna ditemukan dengan ID:', user.id_pengguna);

      const isMatch = await bcrypt.compare(kata_sandi, user.kata_sandi);
      if (!isMatch) {
        console.log('Kata sandi salah untuk email:', email);
        return res.status(401).json({ message: 'Kata sandi salah' });
      }

      const token = jwt.sign(
        { id_pengguna: user.id_pengguna, peran: user.peran, id_kelas: user.id_kelas },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      console.log('Token yang dihasilkan untuk pengguna:', user.id_pengguna);

      res.json({
        token,
        peran: user.peran,
        nama_pengguna: user.nama_pengguna,
        email: user.email,
        no_telepon: user.no_telepon,
        id_kelas: user.id_kelas,
      });
    } catch (error) {
      console.error('Error saat login untuk email:', email, error.message);
      res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
    }
  }

  // Reset Password
  static async resetPassword(req, res) {
    const { no_telepon, kata_sandi } = req.body;

    try {
      // Validasi input
      if (!no_telepon || !kata_sandi) {
        return res.status(400).json({ message: 'Nomor telepon dan kata sandi wajib diisi' });
      }
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(no_telepon)) {
        return res.status(400).json({ message: 'Format nomor telepon tidak valid (contoh: +6281234567890 atau 081234567890)' });
      }
      if (kata_sandi.length < 6) {
        return res.status(400).json({ message: 'Kata sandi harus minimal 6 karakter' });
      }

      // Normalisasi nomor telepon
      let normalizedNoTelepon = no_telepon.replace(/[\s+]/g, '');
      console.log('Nomor telepon dinormalisasi:', normalizedNoTelepon);

      const [user] = await db.query('SELECT * FROM pengguna WHERE no_telepon = ?', [normalizedNoTelepon]);
      if (!user.length) {
        console.log('Pengguna tidak ditemukan untuk nomor:', normalizedNoTelepon);
        return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
      }

      const hashedPassword = await bcrypt.hash(kata_sandi, 10);
      await db.query('UPDATE pengguna SET kata_sandi = ? WHERE no_telepon = ?', [hashedPassword, normalizedNoTelepon]);
      console.log('Kata sandi berhasil diperbarui untuk nomor:', normalizedNoTelepon);

      res.status(200).json({ message: 'Kata sandi berhasil diatur ulang' });
    } catch (error) {
      console.error('Error saat reset kata sandi untuk nomor:', no_telepon, error.message);
      res.status(500).json({ message: 'Gagal mengatur ulang kata sandi', error: error.message });
    }
  }

  // Register
  static async register(req, res) {
    const { nama_pengguna, kata_sandi, peran, no_telepon, email } = req.body;

    try {
      // Periksa apakah email sudah terdaftar
      const [existingEmail] = await db.query('SELECT * FROM pengguna WHERE email = ?', [email]);
      if (existingEmail.length > 0) {
        return res.status(400).json({ message: 'Email sudah terdaftar' });
      }

      // Periksa apakah nomor telepon sudah terdaftar
      const normalizedNoTelepon = no_telepon.replace(/[\s+]/g, '');
      const [existingPhone] = await db.query('SELECT * FROM pengguna WHERE no_telepon = ?', [normalizedNoTelepon]);
      if (existingPhone.length > 0) {
        return res.status(400).json({ message: 'Nomor telepon sudah terdaftar' });
      }

      const hashedPassword = await bcrypt.hash(kata_sandi, 10);
      await db.query(
        'INSERT INTO pengguna (nama_pengguna, kata_sandi, peran, no_telepon, email) VALUES (?, ?, ?, ?, ?)',
        [nama_pengguna, hashedPassword, peran, normalizedNoTelepon, email]
      );
      console.log('Pengguna berhasil didaftarkan:', { nama_pengguna, email });

      res.status(201).json({ message: 'Pengguna berhasil didaftarkan' });
    } catch (error) {
      console.error('Error saat mendaftar pengguna:', error.message);
      res.status(500).json({ message: 'Gagal mendaftar pengguna', error: error.message });
    }
  }

  // Register oleh Admin
  static async registerByAdmin(req, res) {
    const { nama_pengguna, kata_sandi, peran, no_telepon, email, id_kelas } = req.body;

    try {
      console.log(`[${new Date().toISOString()}] Register by admin attempt:`, { nama_pengguna, email, peran, no_telepon, id_kelas });

      // Periksa apakah email sudah terdaftar
      const [existingEmail] = await db.query('SELECT * FROM pengguna WHERE email = ?', [email]);
      if (existingEmail.length > 0) {
        console.log(`[${new Date().toISOString()}] Email already registered:`, email);
        return res.status(400).json({ message: 'Email sudah terdaftar' });
      }

      // Periksa apakah nomor telepon sudah terdaftar
      const normalizedNoTelepon = no_telepon.replace(/[\s+]/g, '');
      const [existingPhone] = await db.query('SELECT * FROM pengguna WHERE no_telepon = ?', [normalizedNoTelepon]);
      if (existingPhone.length > 0) {
        console.log(`[${new Date().toISOString()}] Phone number already registered:`, normalizedNoTelepon);
        return res.status(400).json({ message: 'Nomor telepon sudah terdaftar' });
      }

      // Periksa apakah kelas ada
      const [kelas] = await db.query('SELECT id_kelas FROM kelas WHERE id_kelas = ?', [id_kelas]);
      if (kelas.length === 0) {
        console.log(`[${new Date().toISOString()}] Class not found:`, id_kelas);
        return res.status(400).json({ message: 'Kelas tidak ditemukan' });
      }

      const hashedPassword = await bcrypt.hash(kata_sandi, 10);
      const [result] = await db.query(
        'INSERT INTO pengguna (nama_pengguna, kata_sandi, peran, no_telepon, email, id_kelas) VALUES (?, ?, ?, ?, ?, ?)',
        [nama_pengguna, hashedPassword, peran, normalizedNoTelepon, email, id_kelas]
      );

      console.log(`[${new Date().toISOString()}] User created by admin:`, { id: result.insertId, nama_pengguna, email });
      res.status(201).json({ message: 'Pengguna berhasil dibuat oleh admin' });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in registerByAdmin:`, error.message);
      res.status(500).json({ message: 'Gagal mendaftar pengguna', error: error.message });
    }
  }

  // Get Profile
  static async getProfile(req, res) {
    try {
        console.log('Mengambil profil untuk userId:', req.userId);
        const [users] = await db.query('SELECT * FROM pengguna WHERE id_pengguna = ?', [req.userId]);
        if (!users.length) {
            console.log('Pengguna tidak ditemukan untuk ID:', req.userId);
            return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        }
        const user = users[0];
        console.log('Data pengguna dari database:', user);

        // Ambil id_prodi dan semester dari tabel kelas jika id_kelas ada
        let id_prodi = null;
        let semester = null;
        if (user.id_kelas) {
            console.log('Mengambil data kelas untuk id_kelas:', user.id_kelas);
            try {
                const [kelas] = await db.query('SELECT id_prodi, semester FROM kelas WHERE id_kelas = ?', [user.id_kelas]);
                console.log('Hasil query kelas:', kelas);
                if (kelas.length > 0) {
                    id_prodi = kelas[0].id_prodi;
                    semester = kelas[0].semester;
                } else {
                    console.log('Tidak ada data kelas untuk id_kelas:', user.id_kelas);
                }
            } catch (error) {
                console.error('Error saat query kelas:', error.message);
            }
        }

        const profile = {
            id_pengguna: user.id_pengguna,
            nama_pengguna: user.nama_pengguna,
            peran: user.peran,
            email: user.email,
            no_telepon: user.no_telepon,
            id_kelas: user.id_kelas,
            id_prodi: id_prodi,
            semester: semester,
        };
        console.log('Profil yang dikirim ke client:', profile);
        res.status(200).json(profile);
    } catch (error) {
        console.error('Error saat mengambil profil untuk ID:', req.userId, error.message);
        res.status(500).json({ message: 'Error pada server', error: error.message });
    }
}

  // Get All Profiles
  static async getAllProfiles(req, res) {
    try {
      const [users] = await db.query('SELECT id_pengguna, nama_pengguna, peran, email, no_telepon, id_kelas FROM pengguna');
      res.status(200).json(users);
    } catch (error) {
      console.error('Error saat mengambil semua profil:', error.message);
      res.status(500).json({ message: 'Error pada server', error: error.message });
    }
  }

  // Update Profile
  static async updateProfile(req, res) {
    const { nama_pengguna, email, no_telepon, kata_sandi } = req.body;
    try {
      const [users] = await db.query('SELECT * FROM pengguna WHERE id_pengguna = ?', [req.userId]);
      if (!users.length) {
        console.log('Pengguna tidak ditemukan untuk ID:', req.userId);
        return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
      }
      const user = users[0];

      // Periksa apakah email sudah digunakan oleh pengguna lain
      if (email && email !== user.email) {
        const [existingEmail] = await db.query('SELECT * FROM pengguna WHERE email = ? AND id_pengguna != ?', [email, req.userId]);
        if (existingEmail.length > 0) {
          return res.status(400).json({ message: 'Email sudah digunakan oleh pengguna lain' });
        }
      }

      // Periksa apakah nomor telepon sudah digunakan oleh pengguna lain
      if (no_telepon && no_telepon !== user.no_telepon) {
        const normalizedNoTelepon = no_telepon.replace(/[\s+]/g, '');
        const [existingPhone] = await db.query('SELECT * FROM pengguna WHERE no_telepon = ? AND id_pengguna != ?', [normalizedNoTelepon, req.userId]);
        if (existingPhone.length > 0) {
          return res.status(400).json({ message: 'Nomor telepon sudah digunakan oleh pengguna lain' });
        }
      }

      const updatedUser = {
        nama_pengguna: nama_pengguna || user.nama_pengguna,
        email: email || user.email,
        no_telepon: no_telepon ? no_telepon.replace(/[\s+]/g, '') : user.no_telepon,
        kata_sandi: kata_sandi ? await bcrypt.hash(kata_sandi, 10) : user.kata_sandi,
      };

      await db.query(
        'UPDATE pengguna SET nama_pengguna = ?, email = ?, no_telepon = ?, kata_sandi = ? WHERE id_pengguna = ?',
        [updatedUser.nama_pengguna, updatedUser.email, updatedUser.no_telepon, updatedUser.kata_sandi, req.userId]
      );

      res.status(200).json({ message: 'Profil berhasil diperbarui' });
    } catch (error) {
      console.error('Error saat memperbarui profil untuk ID:', req.userId, error.message);
      res.status(500).json({ message: 'Gagal memperbarui profil', error: error.message });
    }
  }
}

module.exports = AuthController;