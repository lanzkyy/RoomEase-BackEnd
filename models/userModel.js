// models/userModel.js
const db = require('../config/db');

class User {
  static async findByNamaPengguna(nama_pengguna) {
    const [rows] = await db.query('SELECT * FROM pengguna WHERE nama_pengguna = ?', [nama_pengguna]);
    return rows;
  }

  static async findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM pengguna WHERE email = ?', [email]);
    return rows;
  }

  static async findByPhone(no_telepon) {
    const [rows] = await db.query('SELECT * FROM pengguna WHERE no_telepon = ?', [no_telepon]);
    return rows;
  }

  static async findById(id_pengguna) {
    const [rows] = await db.query('SELECT * FROM pengguna WHERE id_pengguna = ?', [id_pengguna]);
    if (!rows.length) return null;

    const user = rows[0];
    let id_prodi = null;
    let semester = null;

    // Ambil id_prodi dan semester dari tabel kelas jika id_kelas ada
    if (user.id_kelas) {
      const [kelas] = await db.query('SELECT id_prodi, semester FROM kelas WHERE id_kelas = ?', [user.id_kelas]);
      if (kelas.length > 0) {
        id_prodi = kelas[0].id_prodi;
        semester = kelas[0].semester;
      }
    }

    return {
      ...user,
      id_prodi,
      semester,
    };
  }

  static async findClassById(id_kelas) {
    const [rows] = await db.query('SELECT * FROM kelas WHERE id_kelas = ?', [id_kelas]);
    return rows;
  }

  static async create(user) {
    const [result] = await db.query(
      'INSERT INTO pengguna (nama_pengguna, kata_sandi, peran, no_telepon, email, id_kelas) VALUES (?, ?, ?, ?, ?, ?)',
      [user.nama_pengguna, user.kata_sandi, user.peran, user.no_telepon, user.email, user.id_kelas]
    );
    return { insertId: result.insertId };
  }
}

module.exports = User;