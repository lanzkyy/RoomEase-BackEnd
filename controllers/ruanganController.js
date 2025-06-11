// controllers/ruanganController.js

const db = require("../config/db");

const getTimestamp = () => new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

class RuanganController {
  static async getAll(req, res) {
    try {
      const timestamp = getTimestamp();
      console.log(`[${timestamp} WITA] Mengambil semua ruangan dari database...`);
      const [ruangan] = await db.query("SELECT * FROM ruangan");
      console.log(`[${timestamp} WITA] Data ruangan:`, ruangan);
      res.status(200).json(ruangan);
    } catch (error) {
      const timestamp = getTimestamp();
      console.error(`[${timestamp} WITA] Error fetching ruangan:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async getById(req, res) {
    const { id } = req.params;
    try {
      const timestamp = getTimestamp();
      console.log(`[${timestamp} WITA] Mengambil ruangan dengan ID: ${id}`);
      const [ruangan] = await db.query("SELECT * FROM ruangan WHERE id_ruangan = ?", [id]);
      if (!ruangan.length) {
        console.log(`[${timestamp} WITA] Ruangan dengan ID ${id} tidak ditemukan`);
        return res.status(404).json({ message: "Ruangan tidak ditemukan" });
      }
      console.log(`[${timestamp} WITA] Ruangan ditemukan:`, ruangan[0]);
      res.status(200).json(ruangan[0]);
    } catch (error) {
      const timestamp = getTimestamp();
      console.error(`[${timestamp} WITA] Error fetching ruangan by ID:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async create(req, res) {
    const { nama_ruangan, lokasi } = req.body;
    const timestamp = getTimestamp();
    console.log(`[${timestamp} WITA] Menerima data untuk membuat ruangan:`, { nama_ruangan, lokasi });

    if (!nama_ruangan || !lokasi) {
      console.log(`[${timestamp} WITA] Validasi gagal: Nama ruangan dan lokasi wajib diisi`);
      return res.status(400).json({ message: "Nama ruangan dan lokasi wajib diisi" });
    }

    try {
      console.log(`[${timestamp} WITA] Mengecek apakah nama ruangan sudah ada...`);
      const [existing] = await db.query("SELECT * FROM ruangan WHERE nama_ruangan = ?", [nama_ruangan]);
      if (existing.length) {
        console.log(`[${timestamp} WITA] Nama ruangan sudah ada:`, nama_ruangan);
        return res.status(400).json({ message: "Nama ruangan sudah ada" });
      }

      console.log(`[${timestamp} WITA] Menyimpan ruangan baru ke database...`);
      const [result] = await db.query(
        "INSERT INTO ruangan (nama_ruangan, lokasi) VALUES (?, ?)",
        [nama_ruangan, lokasi]
      );
      console.log(`[${timestamp} WITA] Ruangan berhasil dibuat dengan ID:`, result.insertId);
      res.status(201).json({ message: "Ruangan berhasil ditambahkan", id: result.insertId });
    } catch (error) {
      const timestamp = getTimestamp();
      console.error(`[${timestamp} WITA] Error creating ruangan:`, error);
      res.status(500).json({ message: "Gagal menambahkan ruangan", error: error.message });
    }
}

static async update(req, res) {
    const { id } = req.params;
    const { nama_ruangan, lokasi } = req.body;
    const timestamp = getTimestamp();
    console.log(`[${timestamp} WITA] Memperbarui ruangan dengan ID: ${id}`, { nama_ruangan, lokasi });

    if (!nama_ruangan || !lokasi) {
      console.log(`[${timestamp} WITA] Validasi gagal: Nama ruangan dan lokasi wajib diisi`);
      return res.status(400).json({ message: "Nama ruangan dan lokasi wajib diisi" });
    }

    try {
      console.log(`[${timestamp} WITA] Mengecek apakah nama ruangan sudah ada (kecuali untuk ruangan ini)...`);
      const [existing] = await db.query(
        "SELECT * FROM ruangan WHERE nama_ruangan = ? AND id_ruangan != ?",
        [nama_ruangan, id]
      );
      if (existing.length) {
        console.log(`[${timestamp} WITA] Nama ruangan sudah ada:`, nama_ruangan);
        return res.status(400).json({ message: "Nama ruangan sudah ada" });
      }

      console.log(`[${timestamp} WITA] Memperbarui ruangan di database...`);
      const [result] = await db.query(
        "UPDATE ruangan SET nama_ruangan = ?, lokasi = ? WHERE id_ruangan = ?",
        [nama_ruangan, lokasi, id]
      );
      if (result.affectedRows === 0) {
        console.log(`[${timestamp} WITA] Ruangan dengan ID ${id} tidak ditemukan`);
        return res.status(404).json({ message: "Ruangan tidak ditemukan" });
      }
      console.log(`[${timestamp} WITA] Ruangan berhasil diperbarui`);
      res.status(200).json({ message: "Ruangan berhasil diupdate" });
    } catch (error) {
      const timestamp = getTimestamp();
      console.error(`[${timestamp} WITA] Error updating ruangan:`, error);
      res.status(500).json({ message: "Gagal mengupdate ruangan", error: error.message });
    }
}

  static async delete(req, res) {
    const { id } = req.params;
    const timestamp = getTimestamp();
    console.log(`[${timestamp} WITA] Menghapus ruangan dengan ID: ${id}`);

    try {
      console.log(`[${timestamp} WITA] Menghapus ruangan dari database...`);
      const [result] = await db.query("DELETE FROM ruangan WHERE id_ruangan = ?", [id]);
      if (result.affectedRows === 0) {
        console.log(`[${timestamp} WITA] Ruangan dengan ID ${id} tidak ditemukan`);
        return res.status(404).json({ message: "Ruangan tidak ditemukan" });
      }
      console.log(`[${timestamp} WITA] Ruangan berhasil dihapus`);
      res.status(200).json({ message: "Ruangan berhasil dihapus" });
    } catch (error) {
      const timestamp = getTimestamp();
      console.error(`[${timestamp} WITA] Error deleting ruangan:`, error);
      res.status(500).json({ message: "Gagal menghapus ruangan", error: error.message });
    }
  }

  static async getPublicRoomStatus(req, res) {
  const timestamp = getTimestamp();
  const { hari, tanggal, waktu } = req.query;
  const tanggalDefault = tanggal || new Date().toLocaleString('en-US', { timeZone: 'Asia/Makassar' }).split(' ')[0].replace(/\//g, '-');
  const currentTime = waktu || new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Makassar' }).slice(0, 5);
  const formattedHari = hari || new Date().toLocaleString("id-ID", { weekday: "long", timeZone: 'Asia/Makassar' });

  console.log(`[${timestamp} WITA] Mengambil status ruangan publik untuk hari: ${formattedHari}, tanggal: ${tanggalDefault}, waktu: ${currentTime}`);

  try {
    if (!hari || !tanggalDefault || !currentTime) {
      return res.status(400).json({ message: "Parameter hari, tanggal, dan waktu wajib diisi" });
    }

    const [ruangans] = await db.query("SELECT * FROM ruangan");
    if (ruangans.length === 0) {
      return res.status(404).json({ message: "Tidak ada ruangan yang ditemukan di database" });
    }

    const [jadwals] = await db.query(
      `
      SELECT 
        kj.id_ruangan, 
        kj.jam_mulai, 
        kj.jam_selesai, 
        COALESCE(jsc.status, kj.status) AS status, 
        jsc.jam_mulai_baru, 
        jsc.jam_selesai_baru, 
        m.nama_matkul
      FROM kelas_jadwal kj
      LEFT JOIN jadwal_status_changes jsc 
        ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal 
        AND jsc.tanggal = ?
      LEFT JOIN mata_kuliah m ON kj.id_matkul = m.id_matkul
      WHERE kj.hari = ?
      `,
      [tanggalDefault, formattedHari]
    );

    const [pemesanans] = await db.query(
      `
      SELECT 
        p.id_ruangan, 
        p.jam_mulai, 
        p.jam_selesai, 
        p.status, 
        m.nama_matkul
      FROM pemesanan p
      LEFT JOIN mata_kuliah m ON p.id_matkul = m.id_matkul
      WHERE p.tanggal = ? 
        AND p.status = 'disetujui' 
        AND p.jam_mulai <= ? 
        AND p.jam_selesai > ?
      `,
      [tanggalDefault, currentTime, currentTime]
    );

    const roomStatus = ruangans.map(room => {
      const jadwal = jadwals.find(j => j.id_ruangan === room.id_ruangan);
      const pemesanan = pemesanans.find(p => p.id_ruangan === room.id_ruangan);

      let status = "Kosong";
      let jadwalInfo = "-";
      let jamMulai = null;
      let jamSelesai = null;

      if (jadwal) {
        const currentStatus = jadwal.status;
        const currentJamMulai = (currentStatus === "Tunda" && jadwal.jam_mulai_baru) ? jadwal.jam_mulai_baru : jadwal.jam_mulai;
        const currentJamSelesai = (currentStatus === "Tunda" && jadwal.jam_selesai_baru) ? jadwal.jam_selesai_baru : jadwal.jam_selesai;

        if ((currentStatus === "Masuk" || currentStatus === "Tunda") && currentJamMulai <= currentTime && currentJamSelesai > currentTime) {
          status = currentStatus === "Masuk" ? "Terisi" : "Tunda";
          jadwalInfo = `${jadwal.nama_matkul || "Tidak Ada Mata Kuliah"} (${currentJamMulai.toString().slice(0, 5)} - ${currentJamSelesai.toString().slice(0, 5)})`;
          jamMulai = currentJamMulai.toString().slice(0, 5);
          jamSelesai = currentJamSelesai.toString().slice(0, 5);
        } else if (currentStatus === "Libur") {
          status = "Libur";
          jadwalInfo = `${jadwal.nama_matkul || "Tidak Ada Mata Kuliah"} (${jadwal.jam_mulai.toString().slice(0, 5)} - ${jadwal.jam_selesai.toString().slice(0, 5)})`;
          jamMulai = jadwal.jam_mulai.toString().slice(0, 5);
          jamSelesai = jadwal.jam_selesai.toString().slice(0, 5);
        }
      }

      if (pemesanan) {
        status = "Terisi";
        jadwalInfo = `${pemesanan.nama_matkul || "Tidak Ada Mata Kuliah"} (${pemesanan.jam_mulai.toString().slice(0, 5)} - ${pemesanan.jam_selesai.toString().slice(0, 5)})`;
        jamMulai = pemesanan.jam_mulai.toString().slice(0, 5);
        jamSelesai = pemesanan.jam_selesai.toString().slice(0, 5);
      }

      return {
        id_ruangan: room.id_ruangan,
        nama_ruangan: room.nama_ruangan,
        status,
        jadwal: jadwalInfo,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
      };
    });

    console.log(`[${timestamp} WITA] Status ruangan publik:`, roomStatus);
    res.status(200).json(roomStatus);
  } catch (error) {
    console.error(`[${timestamp} WITA] Error fetching public room status:`, error);
    res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
  }
}

  static async getRoomStatus(req, res) {
  const timestamp = getTimestamp();
  const { hari, tanggal, waktu } = req.query;
  const tanggalDefault = tanggal || new Date().toISOString().split('T')[0];
  const currentTime = waktu || new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Makassar' }).slice(0, 5);
  const formattedHari = hari || new Date().toLocaleString("id-ID", { weekday: "long", timeZone: 'Asia/Makassar' });

  console.log(`[${timestamp} WITA] Mengambil status ruangan untuk hari: ${formattedHari}, tanggal: ${tanggalDefault}, waktu: ${currentTime}`);

  try {
    if (!hari || !tanggalDefault || !currentTime) {
      console.log(`[${timestamp} WITA] Validasi gagal: Parameter hari, tanggal, dan waktu wajib diisi`);
      return res.status(400).json({ message: "Parameter hari, tanggal, dan waktu wajib diisi" });
    }

    const [ruangans] = await db.query("SELECT * FROM ruangan");
    if (ruangans.length === 0) {
      console.log(`[${timestamp} WITA] Tidak ada ruangan yang ditemukan di database`);
      return res.status(404).json({ message: "Tidak ada ruangan yang ditemukan di database" });
    }

    const [jadwals] = await db.query(
      `
      SELECT 
        kj.id_ruangan, 
        kj.id_kelas_jadwal, 
        kj.jam_mulai, 
        kj.jam_selesai, 
        COALESCE(jsc.status, kj.status) AS status,
        jsc.jam_mulai_baru,
        jsc.jam_selesai_baru,
        m.nama_matkul
      FROM kelas_jadwal kj
      LEFT JOIN jadwal_status_changes jsc 
        ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal 
        AND jsc.tanggal = ?
      LEFT JOIN mata_kuliah m ON kj.id_matkul = m.id_matkul
      WHERE kj.hari = ?
      `,
      [tanggalDefault, formattedHari]
    );

    const [pemesanans] = await db.query(
      `
      SELECT 
        p.id_ruangan, 
        p.jam_mulai, 
        p.jam_selesai,
        p.status, 
        m.nama_matkul
      FROM pemesanan p
      LEFT JOIN mata_kuliah m ON p.id_matkul = m.id_matkul
      WHERE p.tanggal = ? 
        AND p.status = 'disetujui'
        AND p.jam_mulai <= ? 
        AND p.jam_selesai > ?
      `,
      [tanggalDefault, currentTime, currentTime]
    );

    const roomStatus = ruangans.map(room => {
      const jadwal = jadwals.find(j => j.id_ruangan === room.id_ruangan);
      const pemesanan = pemesanans.find(p => p.id_ruangan === room.id_ruangan);

      let status = "Kosong";
      let jadwalInfo = "-";
      let jamMulai = null;
      let jamSelesai = null;

      if (jadwal) {
        const currentStatus = jadwal.status;
        const currentJamMulai = (currentStatus === "Tunda" && jadwal.jam_mulai_baru) ? jadwal.jam_mulai_baru : jadwal.jam_mulai;
        const currentJamSelesai = (currentStatus === "Tunda" && jadwal.jam_selesai_baru) ? jadwal.jam_selesai_baru : jadwal.jam_selesai;

        if (currentStatus === "Masuk" || currentStatus === "Tunda") {
          if (currentJamMulai <= currentTime && currentJamSelesai > currentTime) {
            status = currentStatus === "Masuk" ? "Terisi" : "Tunda";
            jadwalInfo = `${jadwal.nama_matkul || "Tidak Ada Mata Kuliah"} (${currentJamMulai.toString().slice(0, 5)} - ${currentJamSelesai.toString().slice(0, 5)})`;
            jamMulai = currentJamMulai.toString().slice(0, 5);
            jamSelesai = currentJamSelesai.toString().slice(0, 5);
          }
        } else if (currentStatus === "Libur") {
          status = "Libur";
          jadwalInfo = `${jadwal.nama_matkul || "Tidak Ada Mata Kuliah"} (${jadwal.jam_mulai.toString().slice(0, 5)} - ${jadwal.jam_selesai.toString().slice(0, 5)})`;
          jamMulai = jadwal.jam_mulai.toString().slice(0, 5);
          jamSelesai = jadwal.jam_selesai.toString().slice(0, 5);
        }
      }

      if (pemesanan) {
        status = "Terisi";
        jadwalInfo = `${pemesanan.nama_matkul || "Tidak Ada Mata Kuliah"} (${pemesanan.jam_mulai.toString().slice(0, 5)} - ${pemesanan.jam_selesai.toString().slice(0, 5)})`;
        jamMulai = pemesanan.jam_mulai.toString().slice(0, 5);
        jamSelesai = pemesanan.jam_selesai.toString().slice(0, 5);
      }

      return {
        id_ruangan: room.id_ruangan,
        nama_ruangan: room.nama_ruangan,
        status,
        jadwal: jadwalInfo,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
      };
    });

    console.log(`[${timestamp} WITA] Status ruangan:`, roomStatus);
    res.status(200).json(roomStatus);
  } catch (error) {
    console.error(`[${timestamp} WITA] Error fetching room status:`, error);
    res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
  }
}
}

module.exports = RuanganController;