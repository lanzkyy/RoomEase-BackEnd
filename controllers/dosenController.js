// controllers/dosenController.js
const db = require("../config/db");

exports.getAll = async (req, res) => {
  try {
    const prodi = req.query.prodi;
    const includeUmum = req.query.includeUmum === 'true'; // Parameter untuk menyertakan dosen umum

    let query = "SELECT * FROM dosen";
    let params = [];

    if (prodi && includeUmum) {
      query += " WHERE prodi = ? OR prodi = 5"; // Ambil dosen dari prodi kelas dan prodi 5
      params.push(prodi);
    } else if (prodi) {
      query += " WHERE prodi = ?"; // Ambil hanya dosen dari prodi kelas
      params.push(prodi);
    } else if (includeUmum) {
      query += " WHERE prodi = 5"; // Ambil hanya dosen umum
    }

    const [dosen] = await db.query(query, params);
    console.log("Fetched all dosen by prodi:", dosen);
    res.status(200).json(dosen);
  } catch (error) {
    console.error("Error fetching dosen:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
  }
};

exports.getById = async (req, res) => {
  const { id } = req.params;
  try {
    const [dosen] = await db.query("SELECT * FROM dosen WHERE id_dosen = ?", [id]);
    if (!dosen.length) return res.status(404).json({ message: "Dosen tidak ditemukan" });
    console.log("Fetched dosen by ID:", dosen[0]);
    res.status(200).json(dosen[0]);
  } catch (error) {
    console.error("Error fetching dosen by ID:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
  }
};

exports.createDosen = async (req, res) => {
  const { nama_dosen, kode_dosen, no_hp, prodi } = req.body;
  if (!nama_dosen || !kode_dosen) {
    return res.status(400).json({ message: "Nama dosen dan kode dosen wajib diisi" });
  }
  try {
    const [existingDosen] = await db.query("SELECT * FROM dosen WHERE kode_dosen = ?", [kode_dosen]);
    if (existingDosen.length > 0) {
      return res.status(400).json({ message: "Kode dosen sudah digunakan" });
    }

    const [result] = await db.query(
      'INSERT INTO dosen (nama_dosen, kode_dosen, no_hp, prodi) VALUES (?, ?, ?, ?)',
      [nama_dosen, kode_dosen, no_hp || null, prodi || null]
    );
    console.log("Created dosen with ID:", result.insertId);
    res.status(201).json({ message: 'Dosen berhasil ditambahkan', id: result.insertId });
  } catch (error) {
    console.error("Error creating dosen:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Kode dosen sudah digunakan" });
    }
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
};

exports.updateDosen = async (req, res) => {
  const { id } = req.params;
  const { nama_dosen, kode_dosen, no_hp, prodi } = req.body;
  if (!nama_dosen || !kode_dosen) {
    return res.status(400).json({ message: "Nama dosen dan kode dosen wajib diisi" });
  }
  try {
    const [existingDosen] = await db.query(
      "SELECT * FROM dosen WHERE kode_dosen = ? AND id_dosen != ?",
      [kode_dosen, id]
    );
    if (existingDosen.length > 0) {
      return res.status(400).json({ message: "Kode dosen sudah digunakan oleh dosen lain" });
    }

    const [result] = await db.query(
      'UPDATE dosen SET nama_dosen = ?, kode_dosen = ?, no_hp = ?, prodi = ? WHERE id_dosen = ?',
      [nama_dosen, kode_dosen, no_hp || null, prodi || null, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Dosen tidak ditemukan" });
    console.log("Updated dosen with ID:", id);
    res.status(200).json({ message: 'Dosen berhasil diperbarui' });
  } catch (error) {
    console.error("Error updating dosen:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Kode dosen sudah digunakan" });
    }
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
};

exports.deleteDosen = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM dosen WHERE id_dosen = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Dosen tidak ditemukan" });
    console.log("Deleted dosen with ID:", id);
    res.status(200).json({ message: 'Dosen berhasil dihapus' });
  } catch (error) {
    console.error("Error deleting dosen:", error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
};