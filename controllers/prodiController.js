//controllers/prodiController.js

const db = require("../config/db");

class ProdiController {
  static async getAllProdi(req, res) {
    try {
      console.log(`[${new Date().toISOString()}] Mengambil semua prodi dari database...`);
      const [prodi] = await db.query("SELECT * FROM prodi ORDER BY id_prodi ASC");
      console.log(`[${new Date().toISOString()}] Data prodi:`, prodi);
      res.status(200).json(prodi);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching prodi:`, error.stack);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async getKelasByProdi(req, res) {
    const { id_prodi } = req.query;

    if (!id_prodi) {
      return res.status(400).json({ message: "ID Prodi harus diisi." });
    }

    // Tambahkan validasi tipe data untuk id_prodi (harus integer)
    const idProdiNum = parseInt(id_prodi, 10);
    if (isNaN(idProdiNum)) {
      return res.status(400).json({ message: "ID Prodi harus berupa angka." });
    }

    try {
      const [kelas] = await db.query(
        "SELECT k.*, p.nama_prodi FROM kelas k JOIN prodi p ON k.id_prodi = p.id_prodi WHERE k.id_prodi = ? ORDER BY k.id_kelas ASC",
        [idProdiNum]
      );
      console.log(`[${new Date().toISOString()}] Kelas fetched for prodi ${idProdiNum}:`, kelas);
      res.status(200).json(kelas);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching kelas for prodi ${idProdiNum}:`, error.stack);
      res.status(500).json({ message: "Gagal mengambil daftar kelas.", error: error.message });
    }
  }
}

module.exports = ProdiController;