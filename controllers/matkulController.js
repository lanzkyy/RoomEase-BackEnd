// controllers/matkulController.js

const db = require("../config/db");

class MatkulController {
  static async getAll(req, res) {
  try {
    console.log("Mengambil semua mata kuliah dari database...");
    const idProdi = req.query.id_prodi;
    const semester = req.query.semester;
    let query = `
      SELECT mk.*, p.nama_prodi 
      FROM mata_kuliah mk 
      LEFT JOIN prodi p ON mk.id_prodi = p.id_prodi
    `;
    let params = [];
    if (idProdi || semester) {
      query += " WHERE";
      if (idProdi) {
        query += " mk.id_prodi = ?";
        params.push(idProdi);
      }
      if (idProdi && semester) query += " AND";
      if (semester) {
        query += " mk.semester = ?";
        params.push(semester);
      }
    }
    const [matkul] = await db.query(query, params);
    console.log("Data mata kuliah:", matkul);
    if (matkul.length === 0) {
      return res.status(404).json({ message: "Tidak ada mata kuliah yang ditemukan" });
    }
    res.status(200).json(matkul);
  } catch (error) {
    console.error("Error fetching mata kuliah:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
  }
}

  static async getById(req, res) {
    const { id } = req.params;
    try {
      console.log(`Mengambil mata kuliah dengan ID: ${id}`);
      const [matkul] = await db.query(
        "SELECT mk.*, p.nama_prodi FROM mata_kuliah mk LEFT JOIN prodi p ON mk.id_prodi = p.id_prodi WHERE mk.id_matkul = ?",
        [id]
      );
      if (!matkul.length) {
        console.log(`Mata kuliah dengan ID ${id} tidak ditemukan`);
        return res.status(404).json({ message: "Mata kuliah tidak ditemukan" });
      }
      console.log("Mata kuliah ditemukan:", matkul[0]);
      res.status(200).json(matkul[0]);
    } catch (error) {
      console.error("Error fetching mata kuliah by ID:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async create(req, res) {
    const { nama_matkul, id_prodi, semester } = req.body;
    console.log("Menerima data untuk membuat mata kuliah:", { nama_matkul, id_prodi, semester });

    if (!nama_matkul || !id_prodi || !semester) {
      console.log("Validasi gagal: Nama mata kuliah, id_prodi, dan semester wajib diisi");
      return res.status(400).json({ message: "Nama mata kuliah, prodi, dan semester wajib diisi" });
    }

    const trimmedNama = nama_matkul.trim();
    if (trimmedNama.length > 30) {
      console.log("Validasi gagal: Nama mata kuliah terlalu panjang");
      return res.status(400).json({ message: "Nama mata kuliah tidak boleh lebih dari 30 karakter" });
    }

    const semesterNum = parseInt(semester);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      console.log("Validasi gagal: Semester harus antara 1 dan 8");
      return res.status(400).json({ message: "Semester harus antara 1 dan 8" });
    }

    // Validasi id_prodi terhadap tabel prodi
    try {
      const [validProdi] = await db.query("SELECT id_prodi FROM prodi WHERE id_prodi = ?", [id_prodi]);
      if (!validProdi.length) {
        console.log(`ID Prodi tidak valid: ${id_prodi}`);
        return res.status(400).json({ message: `ID Prodi tidak valid: ${id_prodi}` });
      }
    } catch (error) {
      console.error("Error validating id_prodi:", error);
      return res.status(500).json({ message: "Gagal memvalidasi prodi", error: error.message });
    }

    try {
      console.log("Mengecek apakah nama mata kuliah sudah ada...");
      const [existing] = await db.query(
        "SELECT * FROM mata_kuliah WHERE nama_matkul = ? AND id_prodi = ? AND semester = ?",
        [trimmedNama, id_prodi, semesterNum]
      );
      if (existing.length) {
        console.log("Nama mata kuliah sudah ada untuk prodi dan semester ini:", trimmedNama);
        return res.status(400).json({ message: "Nama mata kuliah sudah ada untuk prodi dan semester ini" });
      }

      console.log("Menyimpan mata kuliah baru ke database...");
      const [result] = await db.query(
        "INSERT INTO mata_kuliah (nama_matkul, id_prodi, semester) VALUES (?, ?, ?)",
        [trimmedNama, id_prodi, semesterNum]
      );
      console.log("Mata kuliah berhasil dibuat dengan ID:", result.insertId);
      res.status(201).json({ message: "Mata kuliah berhasil ditambahkan", id: result.insertId });
    } catch (error) {
      console.error("Error creating mata kuliah:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ message: "Nama mata kuliah sudah ada untuk prodi dan semester ini" });
      }
      res.status(500).json({ message: "Gagal menambahkan mata kuliah", error: error.message });
    }
  }

  static async getProdi(req, res) {
    try {
      console.log("Mengambil daftar prodi dari tabel prodi...");
      const [prodi] = await db.query("SELECT id_prodi, nama_prodi FROM prodi");
      console.log("Daftar prodi:", prodi);
      if (prodi.length === 0) {
        return res.status(404).json({ message: "Belum ada prodi yang tersedia. Tambahkan prodi terlebih dahulu." });
      }
      res.status(200).json(prodi);
    } catch (error) {
      console.error("Error fetching prodi:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async update(req, res) {
    const { id } = req.params;
    const { nama_matkul, id_prodi, semester } = req.body;
    console.log(`Memperbarui mata kuliah dengan ID: ${id}`, { nama_matkul, id_prodi, semester });

    if (!nama_matkul || !id_prodi || !semester) {
      console.log("Validasi gagal: Nama mata kuliah, id_prodi, dan semester wajib diisi");
      return res.status(400).json({ message: "Nama mata kuliah, prodi, dan semester wajib diisi" });
    }

    const trimmedNama = nama_matkul.trim();
    if (trimmedNama.length > 30) {
      console.log("Validasi gagal: Nama mata kuliah terlalu panjang");
      return res.status(400).json({ message: "Nama mata kuliah tidak boleh lebih dari 30 karakter" });
    }

    const semesterNum = parseInt(semester);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      console.log("Validasi gagal: Semester harus antara 1 dan 8");
      return res.status(400).json({ message: "Semester harus antara 1 dan 8" });
    }

    // Validasi id_prodi terhadap tabel prodi
    try {
      const [validProdi] = await db.query("SELECT id_prodi FROM prodi WHERE id_prodi = ?", [id_prodi]);
      if (!validProdi.length) {
        console.log(`ID Prodi tidak valid: ${id_prodi}`);
        return res.status(400).json({ message: `ID Prodi tidak valid: ${id_prodi}` });
      }
    } catch (error) {
      console.error("Error validating id_prodi:", error);
      return res.status(500).json({ message: "Gagal memvalidasi prodi", error: error.message });
    }

    try {
      console.log("Mengecek apakah nama mata kuliah sudah ada (kecuali untuk mata kuliah ini)...");
      const [existing] = await db.query(
        "SELECT * FROM mata_kuliah WHERE nama_matkul = ? AND id_prodi = ? AND semester = ? AND id_matkul != ?",
        [trimmedNama, id_prodi, semesterNum, id]
      );
      if (existing.length) {
        console.log("Nama mata kuliah sudah ada untuk prodi dan semester ini:", trimmedNama);
        return res.status(400).json({ message: "Nama mata kuliah sudah ada untuk prodi dan semester ini" });
      }

      console.log("Memperbarui mata kuliah di database...");
      const [result] = await db.query(
        "UPDATE mata_kuliah SET nama_matkul = ?, id_prodi = ?, semester = ? WHERE id_matkul = ?",
        [trimmedNama, id_prodi, semesterNum, id]
      );
      if (result.affectedRows === 0) {
        console.log(`Mata kuliah dengan ID ${id} tidak ditemukan`);
        return res.status(404).json({ message: "Mata kuliah tidak ditemukan" });
      }
      console.log("Mata kuliah berhasil diperbarui");
      res.status(200).json({ message: "Mata kuliah berhasil diperbarui" });
    } catch (error) {
      console.error("Error updating mata kuliah:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ message: "Nama mata kuliah sudah ada untuk prodi dan semester ini" });
      }
      res.status(500).json({ message: "Gagal memperbarui mata kuliah", error: error.message });
    }
  }

  static async delete(req, res) {
    const { id } = req.params;
    console.log(`Menghapus mata kuliah dengan ID: ${id}`);

    try {
      console.log("Menghapus mata kuliah dari database...");
      const [result] = await db.query("DELETE FROM mata_kuliah WHERE id_matkul = ?", [id]);
      if (result.affectedRows === 0) {
        console.log(`Mata kuliah dengan ID ${id} tidak ditemukan`);
        return res.status(404).json({ message: "Mata kuliah tidak ditemukan" });
      }
      console.log("Mata kuliah berhasil dihapus");
      res.status(200).json({ message: "Mata kuliah berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting mata kuliah:", error);
      res.status(500).json({ message: "Gagal menghapus mata kuliah", error: error.message });
    }
  }
}

module.exports = MatkulController;