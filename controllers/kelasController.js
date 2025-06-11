// controller/kelasController.js

const db = require("../config/db");

class KelasController {
  static async getAll(req, res) {
    try {
      console.log("Mengambil semua kelas (admin) dari database...");
      const [kelas] = await db.query(
        "SELECT k.*, p.nama_prodi FROM kelas k JOIN prodi p ON k.id_prodi = p.id_prodi ORDER BY k.id_kelas ASC"
      );
      console.log("Data kelas (admin):", kelas);
      res.status(200).json(kelas);
    } catch (error) {
      console.error("Error fetching kelas (admin):", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async getAllPublic(req, res) {
    try {
      console.log("Mengambil semua kelas (publik) dari database...");
      const [kelas] = await db.query(
        "SELECT k.*, p.nama_prodi FROM kelas k JOIN prodi p ON k.id_prodi = p.id_prodi ORDER BY k.id_kelas ASC"
      );
      console.log("Data kelas (publik):", kelas);
      res.status(200).json(kelas);
    } catch (error) {
      console.error("Error fetching kelas (publik):", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async getById(req, res) {
    const { id } = req.params;
    try {
      console.log(`Mengambil kelas dengan ID: ${id}`);
      const [kelas] = await db.query(
        "SELECT k.*, p.nama_prodi FROM kelas k JOIN prodi p ON k.id_prodi = p.id_prodi WHERE k.id_kelas = ?",
        [id]
      );
      if (!kelas.length) {
        console.log(`Kelas dengan ID ${id} tidak ditemukan`);
        return res.status(404).json({ message: "Kelas tidak ditemukan" });
      }
      console.log("Kelas ditemukan:", kelas[0]);
      res.status(200).json(kelas[0]);
    } catch (error) {
      console.error("Error fetching kelas by ID:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async create(req, res) {
    const { nama_kelas, id_prodi } = req.body;
    console.log("Menerima data untuk membuat kelas:", { nama_kelas, id_prodi });

    if (!nama_kelas) {
      console.log("Validasi gagal: Nama kelas wajib diisi");
      return res.status(400).json({ message: "Nama kelas wajib diisi" });
    }

    if (!id_prodi) {
      console.log("Validasi gagal: Prodi wajib dipilih");
      return res.status(400).json({ message: "Prodi wajib dipilih" });
    }

    // Validasi format nama_kelas
    const namaKelasPattern = /^[A-Z]{2,4}\s[0-9][A-Z]+$/;
    if (!namaKelasPattern.test(nama_kelas)) {
      console.log("Validasi gagal: Format nama kelas tidak valid");
      return res.status(400).json({
        message: "Format nama kelas tidak valid. Contoh: TI 4A, TRK 4B, atau TIM 4FF (2-4 huruf besar, spasi, angka, lalu satu atau lebih huruf besar).",
      });
    }

    // Ekstrak semester dari nama_kelas
    const [, semesterAndSuffix] = nama_kelas.trim().split(" ");
    const semester = parseInt(semesterAndSuffix[0], 10);

    if (isNaN(semester) || semester < 1 || semester > 8) {
      console.log("Validasi gagal: Semester harus antara 1 dan 8");
      return res.status(400).json({ message: "Semester harus antara 1 dan 8" });
    }

    try {
      console.log("Mengecek apakah nama kelas sudah ada...");
      const [existing] = await db.query("SELECT * FROM kelas WHERE nama_kelas = ?", [nama_kelas]);
      if (existing.length) {
        console.log("Nama kelas sudah ada:", nama_kelas);
        return res.status(400).json({ message: "Nama kelas sudah ada" });
      }

      console.log("Mengecek apakah id_prodi valid...");
      const [prodiResult] = await db.query("SELECT id_prodi FROM prodi WHERE id_prodi = ?", [id_prodi]);
      if (!prodiResult.length) {
        console.log(`Prodi dengan ID ${id_prodi} tidak ditemukan di tabel prodi`);
        return res.status(400).json({ message: "Prodi tidak ditemukan di database" });
      }

      console.log("Menyimpan kelas baru ke database...");
      const [result] = await db.query(
        "INSERT INTO kelas (nama_kelas, semester, id_prodi) VALUES (?, ?, ?)",
        [nama_kelas, semester, id_prodi]
      );
      console.log("Kelas berhasil dibuat dengan ID:", result.insertId);
      res.status(201).json({ message: "Kelas berhasil ditambahkan", id: result.insertId });
    } catch (error) {
      console.error("Error creating kelas:", error);
      res.status(500).json({ message: "Gagal menambahkan kelas", error: error.message });
    }
  }

  static async update(req, res) {
    const { id } = req.params;
    const { nama_kelas, id_prodi } = req.body;
    console.log(`Memperbarui kelas dengan ID: ${id}`, { nama_kelas, id_prodi });

    if (!nama_kelas) {
      console.log("Validasi gagal: Nama kelas wajib diisi");
      return res.status(400).json({ message: "Nama kelas wajib diisi" });
    }

    if (!id_prodi) {
      console.log("Validasi gagal: Prodi wajib dipilih");
      return res.status(400).json({ message: "Prodi wajib dipilih" });
    }

    // Validasi format nama_kelas
    const namaKelasPattern = /^[A-Z]{2,4}\s[0-9][A-Z]+$/;
    if (!namaKelasPattern.test(nama_kelas)) {
      console.log("Validasi gagal: Format nama kelas tidak valid");
      return res.status(400).json({
        message: "Format nama kelas tidak valid. Contoh: TI 4A, TRK 4B, atau TIM 4FF (2-4 huruf besar, spasi, angka, lalu satu atau lebih huruf besar).",
      });
    }

    // Ekstrak semester dari nama_kelas
    const [, semesterAndSuffix] = nama_kelas.trim().split(" ");
    const semester = parseInt(semesterAndSuffix[0], 10);

    if (isNaN(semester) || semester < 1 || semester > 8) {
      console.log("Validasi gagal: Semester harus antara 1 dan 8");
      return res.status(400).json({ message: "Semester harus antara 1 dan 8" });
    }

    try {
      // Cek apakah nama kelas sudah ada (kecuali untuk kelas ini)
      console.log("Mengecek apakah nama kelas sudah ada (kecuali untuk kelas ini)...");
      const [existing] = await db.query(
        "SELECT * FROM kelas WHERE nama_kelas = ? AND id_kelas != ?",
        [nama_kelas, id]
      );
      if (existing.length) {
        console.log("Nama kelas sudah ada:", nama_kelas);
        return res.status(400).json({ message: "Nama kelas sudah ada" });
      }

      console.log("Mengecek apakah id_prodi valid...");
      const [prodiResult] = await db.query("SELECT id_prodi FROM prodi WHERE id_prodi = ?", [id_prodi]);
      if (!prodiResult.length) {
        console.log(`Prodi dengan ID ${id_prodi} tidak ditemukan di tabel prodi`);
        return res.status(400).json({ message: "Prodi tidak ditemukan di database" });
      }

      console.log("Memperbarui kelas di database...");
      const [result] = await db.query(
        "UPDATE kelas SET nama_kelas = ?, semester = ?, id_prodi = ? WHERE id_kelas = ?",
        [nama_kelas, semester, id_prodi, id]
      );
      if (result.affectedRows === 0) {
        console.log(`Kelas dengan ID ${id} tidak ditemukan`);
        return res.status(404).json({ message: "Kelas tidak ditemukan" });
      }
      console.log("Kelas berhasil diperbarui");
      res.status(200).json({ message: "Kelas berhasil diupdate" });
    } catch (error) {
      console.error("Error updating kelas:", error);
      res.status(500).json({ message: "Gagal mengupdate kelas", error: error.message });
    }
  }

  static async delete(req, res) {
    const { id } = req.params;
    console.log(`Menghapus kelas dengan ID: ${id}`);

    try {
      console.log("Menghapus kelas dari database...");
      const [result] = await db.query("DELETE FROM kelas WHERE id_kelas = ?", [id]);
      if (result.affectedRows === 0) {
        console.log(`Kelas dengan ID ${id} tidak ditemukan`);
        return res.status(404).json({ message: "Kelas tidak ditemukan" });
      }
      console.log("Kelas berhasil dihapus");
      res.status(200).json({ message: "Kelas berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting kelas:", error);
      res.status(500).json({ message: "Gagal menghapus kelas", error: error.message });
    }
  }
}

module.exports = KelasController;