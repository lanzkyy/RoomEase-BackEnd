// controllers/PemesananController.js

const db = require("../config/db");

const getTimestamp = () => new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

class PemesananController {
  static async getAll(req, res) {
    const { status } = req.query;
    const timestamp = getTimestamp();

    try {
      let query = `
        SELECT 
          p.*, 
          r.nama_ruangan, 
          r.lokasi, 
          m.nama_matkul, 
          d.nama_dosen, 
          k.nama_kelas,
          CONCAT(p.tanggal, ' ', p.jam_mulai) AS waktu_mulai,
          CONCAT(p.tanggal, ' ', p.jam_selesai) AS waktu_selesai
        FROM pemesanan p
        LEFT JOIN ruangan r ON p.id_ruangan = r.id_ruangan
        LEFT JOIN mata_kuliah m ON p.id_matkul = m.id_matkul
        LEFT JOIN dosen d ON p.id_dosen = d.id_dosen
        LEFT JOIN kelas k ON p.id_kelas = k.id_kelas
      `;
      const params = [];

      if (status) {
        query += ` WHERE p.status = ?`;
        params.push(status);
      }

      const [bookings] = await db.query(query, params);

      console.log(`[${timestamp} WITA] Pemesanan berhasil diambil:`, bookings.length);
      res.status(200).json(bookings);
    } catch (error) {
      console.error(`[${timestamp} WITA] Error fetching bookings:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async getById(req, res) {
  const { id } = req.params;
  const timestamp = getTimestamp();
  try {
    const [pemesanan] = await db.query(
      `
      SELECT 
        p.id_pemesanan,
        p.id_kelas,
        p.id_matkul,
        p.id_dosen,
        p.id_ruangan,
        k.nama_kelas,
        r.nama_ruangan,
        r.lokasi,
        m.nama_matkul,
        d.nama_dosen,
        CONCAT(p.tanggal, ' ', p.jam_mulai) AS waktu_mulai,
        CONCAT(p.tanggal, ' ', p.jam_selesai) AS waktu_selesai,
        p.status
      FROM pemesanan p
      LEFT JOIN kelas k ON p.id_kelas = k.id_kelas
      LEFT JOIN ruangan r ON p.id_ruangan = r.id_ruangan
      LEFT JOIN mata_kuliah m ON p.id_matkul = m.id_matkul
      LEFT JOIN dosen d ON p.id_dosen = d.id_dosen
      WHERE p.id_pemesanan = ?
      `,
      [id]
    );

    if (pemesanan.length === 0) {
      console.log(`[${timestamp} WITA] Pemesanan dengan ID ${id} tidak ditemukan`);
      return res.status(404).json({ message: 'Pemesanan tidak ditemukan' });
    }

    console.log(`[${timestamp} WITA] Detail pemesanan ditemukan untuk id ${id}:`, pemesanan[0]);
    res.status(200).json(pemesanan[0]);
  } catch (error) {
    console.error(`[${timestamp} WITA] Gagal mengambil pemesanan:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
}

  static async create(req, res) {
    const { id_ruangan, id_matkul, id_dosen, hari, jam_mulai, jam_selesai, tanggal, keterangan, id_pengguna, id_kelas } = req.body;
    const timestamp = getTimestamp();

    try {
      if (!id_ruangan || !id_matkul || !id_dosen || !hari || !jam_mulai || !jam_selesai || !tanggal || !id_pengguna || !id_kelas) {
        console.log(`[${timestamp} WITA] Validasi gagal: Semua kolom wajib diisi.`, req.body);
        return res.status(400).json({ message: "Semua kolom wajib diisi" });
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!dateRegex.test(tanggal)) {
        console.log(`[${timestamp} WITA] Validasi gagal: Format tanggal tidak valid.`);
        return res.status(400).json({ message: "Format tanggal tidak valid. Gunakan YYYY-MM-DD." });
      }
      if (!timeRegex.test(jam_mulai) || !timeRegex.test(jam_selesai)) {
        console.log(`[${timestamp} WITA] Validasi gagal: Format jam tidak valid.`);
        return res.status(400).json({ message: "Format jam tidak valid. Gunakan HH:mm." });
      }

      if (jam_mulai >= jam_selesai) {
        console.log(`[${timestamp} WITA] Validasi gagal: Waktu selesai harus lebih besar dari waktu mulai.`);
        return res.status(400).json({ message: "Waktu selesai harus lebih besar dari waktu mulai" });
      }

      const [ruangan] = await db.query("SELECT * FROM ruangan WHERE id_ruangan = ?", [id_ruangan]);
      if (!ruangan.length) {
        console.log(`[${timestamp} WITA] Ruangan dengan ID ${id_ruangan} tidak ditemukan.`);
        return res.status(404).json({ message: "Ruangan tidak ditemukan" });
      }

      const [matkul] = await db.query("SELECT * FROM mata_kuliah WHERE id_matkul = ?", [id_matkul]);
      if (!matkul.length) {
        console.log(`[${timestamp} WITA] Mata kuliah dengan ID ${id_matkul} tidak ditemukan.`);
        return res.status(404).json({ message: "Mata kuliah tidak ditemukan" });
      }

      const [dosen] = await db.query("SELECT * FROM dosen WHERE id_dosen = ?", [id_dosen]);
      if (!dosen.length) {
        console.log(`[${timestamp} WITA] Dosen dengan ID ${id_dosen} tidak ditemukan.`);
        return res.status(404).json({ message: "Dosen tidak ditemukan" });
      }

      const [kelas] = await db.query("SELECT * FROM kelas WHERE id_kelas = ?", [id_kelas]);
      if (!kelas.length) {
        console.log(`[${timestamp} WITA] Kelas dengan ID ${id_kelas} tidak ditemukan.`);
        return res.status(404).json({ message: "Kelas tidak ditemukan" });
      }

      const [user] = await db.query("SELECT peran, id_kelas FROM pengguna WHERE id_pengguna = ?", [id_pengguna]);
      if (!user.length) {
        console.log(`[${timestamp} WITA] Pengguna dengan ID ${id_pengguna} tidak ditemukan.`);
        return res.status(404).json({ message: "Pengguna tidak ditemukan" });
      }

      const [jadwalKonflik] = await db.query(
        `
        SELECT kj.*, jsc.status AS temp_status, jsc.jam_mulai_baru, jsc.jam_selesai_baru
        FROM kelas_jadwal kj
        LEFT JOIN jadwal_status_changes jsc 
          ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal 
          AND jsc.tanggal = ?
        WHERE kj.id_ruangan = ? 
          AND kj.hari = ?
        `,
        [tanggal, id_ruangan, hari]
      );

      let hasConflict = false;
      for (const jadwal of jadwalKonflik) {
        const jadwalJamMulai = jadwal.temp_status === 'Tunda' && jadwal.jam_mulai_baru ? jadwal.jam_mulai_baru : jadwal.jam_mulai;
        const jadwalJamSelesai = jadwal.temp_status === 'Tunda' && jadwal.jam_selesai_baru ? jadwal.jam_selesai_baru : jadwal.jam_selesai;

        if (jadwal.temp_status === 'Libur') continue;

        const conflictExists = (
          (jadwalJamMulai <= jam_mulai && jadwalJamSelesai > jam_mulai) ||
          (jadwalJamMulai < jam_selesai && jadwalJamSelesai >= jam_selesai) ||
          (jadwalJamMulai >= jam_mulai && jadwalJamSelesai <= jam_selesai)
        );

        if (conflictExists) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict) {
        console.log(`[${timestamp} WITA] Ruangan ${id_ruangan} sudah terisi oleh jadwal untuk waktu ${jam_mulai} - ${jam_selesai}.`);
        return res.status(400).json({ message: "Ruangan sudah terisi oleh jadwal untuk waktu tersebut" });
      }

      const [pemesananKonflik] = await db.query(
        `
        SELECT * FROM pemesanan
        WHERE id_ruangan = ?
          AND tanggal = ?
          AND (
            (jam_mulai <= ? AND jam_selesai > ?) OR 
            (jam_mulai < ? AND jam_selesai >= ?) OR 
            (jam_mulai >= ? AND jam_selesai <= ?)
          )
        `,
        [id_ruangan, tanggal, jam_mulai, jam_mulai, jam_selesai, jam_selesai, jam_mulai, jam_selesai]
      );
      if (pemesananKonflik.length > 0) {
        console.log(`[${timestamp} WITA] Ruangan ${id_ruangan} sudah dipesan untuk waktu ${jam_mulai} - ${jam_selesai}.`);
        return res.status(400).json({ message: "Ruangan sudah dipesan untuk waktu tersebut" });
      }

      const [result] = await db.query(
        `
        INSERT INTO pemesanan (id_ruangan, id_pengguna, id_matkul, id_dosen, hari, jam_mulai, jam_selesai, tanggal, keterangan, id_kelas, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'diproses')
        `,
        [id_ruangan, id_pengguna, id_matkul, id_dosen, hari, jam_mulai, jam_selesai, tanggal, keterangan || null, id_kelas]
      );

      console.log(`[${timestamp} WITA] Pemesanan berhasil diajukan dengan ID ${result.insertId}.`);
      res.status(201).json({ message: "Pemesanan berhasil diajukan", id: result.insertId });
    } catch (error) {
      console.error(`[${timestamp} WITA] Error creating pemesanan:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async update(req, res) {
    const { id } = req.params;
    const { id_kelas, id_ruangan, id_matkul, id_dosen, tanggal, jam_mulai, jam_selesai, keterangan, id_pengguna, status = 'diproses' } = req.body;
    const timestamp = getTimestamp();

    try {
        const [pemesanan] = await db.query('SELECT * FROM pemesanan WHERE id_pemesanan = ?', [id]);
        if (pemesanan.length === 0) {
            console.log(`[${timestamp} WITA] Pemesanan dengan ID ${id} tidak ditemukan`);
            return res.status(404).json({ message: 'Pemesanan tidak ditemukan' });
        }

        if (!id_kelas || !id_ruangan || !id_matkul || !id_dosen || !tanggal || !jam_mulai || !jam_selesai || !id_pengguna) {
            console.log(`[${timestamp} WITA] Validasi gagal: Semua kolom wajib diisi.`, req.body);
            return res.status(400).json({ message: "Semua kolom wajib diisi" });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!dateRegex.test(tanggal)) {
            console.log(`[${timestamp} WITA] Validasi gagal: Format tanggal tidak valid.`);
            return res.status(400).json({ message: "Format tanggal tidak valid. Gunakan YYYY-MM-DD." });
        }
        if (!timeRegex.test(jam_mulai) || !timeRegex.test(jam_selesai)) {
            console.log(`[${timestamp} WITA] Validasi gagal: Format jam tidak valid.`);
            return res.status(400).json({ message: "Format jam tidak valid. Gunakan HH:mm." });
        }

        if (jam_mulai >= jam_selesai) {
            console.log(`[${timestamp} WITA] Validasi gagal: Waktu selesai harus lebih besar dari waktu mulai.`);
            return res.status(400).json({ message: "Waktu selesai harus lebih besar dari waktu mulai" });
        }

        const hari = new Date(tanggal).toLocaleString("id-ID", { weekday: "long", timeZone: "Asia/Makassar" });

        // Validasi data referensi
        const [ruangan] = await db.query("SELECT * FROM ruangan WHERE id_ruangan = ?", [id_ruangan]);
        if (!ruangan.length) {
            console.log(`[${timestamp} WITA] Ruangan dengan ID ${id_ruangan} tidak ditemukan.`);
            return res.status(404).json({ message: "Ruangan tidak ditemukan" });
        }

        const [matkul] = await db.query("SELECT * FROM mata_kuliah WHERE id_matkul = ?", [id_matkul]);
        if (!matkul.length) {
            console.log(`[${timestamp} WITA] Mata kuliah dengan ID ${id_matkul} tidak ditemukan.`);
            return res.status(404).json({ message: "Mata kuliah tidak ditemukan" });
        }

        const [dosen] = await db.query("SELECT * FROM dosen WHERE id_dosen = ?", [id_dosen]);
        if (!dosen.length) {
            console.log(`[${timestamp} WITA] Dosen dengan ID ${id_dosen} tidak ditemukan.`);
            return res.status(404).json({ message: "Dosen tidak ditemukan" });
        }

        const [kelas] = await db.query("SELECT * FROM kelas WHERE id_kelas = ?", [id_kelas]);
        if (!kelas.length) {
            console.log(`[${timestamp} WITA] Kelas dengan ID ${id_kelas} tidak ditemukan.`);
            return res.status(404).json({ message: "Kelas tidak ditemukan" });
        }

        const [user] = await db.query("SELECT peran, id_kelas FROM pengguna WHERE id_pengguna = ?", [id_pengguna]);
        if (!user.length) {
            console.log(`[${timestamp} WITA] Pengguna dengan ID ${id_pengguna} tidak ditemukan.`);
            return res.status(404).json({ message: "Pengguna tidak ditemukan" });
        }

        const [jadwalKonflik] = await db.query(
            `
            SELECT kj.*, jsc.status AS temp_status, jsc.jam_mulai_baru, jsc.jam_selesai_baru
            FROM kelas_jadwal kj
            LEFT JOIN jadwal_status_changes jsc 
              ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal 
              AND jsc.tanggal = ?
            WHERE kj.id_ruangan = ? 
              AND kj.hari = ?
            `,
            [tanggal, id_ruangan, hari]
        );

        let hasConflict = false;
        for (const jadwal of jadwalKonflik) {
            const jadwalJamMulai = jadwal.temp_status === 'Tunda' && jadwal.jam_mulai_baru ? jadwal.jam_mulai_baru : jadwal.jam_mulai;
            const jadwalJamSelesai = jadwal.temp_status === 'Tunda' && jadwal.jam_selesai_baru ? jadwal.jam_selesai_baru : jadwal.jam_selesai;

            if (jadwal.temp_status === 'Libur') continue;

            const conflictExists = (
                (jadwalJamMulai <= jam_mulai && jadwalJamSelesai > jam_mulai) ||
                (jadwalJamMulai < jam_selesai && jadwalJamSelesai >= jam_selesai) ||
                (jadwalJamMulai >= jam_mulai && jadwalJamSelesai <= jam_selesai)
            );

            if (conflictExists) {
                hasConflict = true;
                break;
            }
        }

        if (hasConflict) {
            console.log(`[${timestamp} WITA] Ruangan ${id_ruangan} sudah terisi oleh jadwal untuk waktu ${jam_mulai} - ${jam_selesai}.`);
            return res.status(400).json({ message: "Ruangan sudah terisi oleh jadwal untuk waktu tersebut" });
        }

        const [pemesananKonflik] = await db.query(
            `
            SELECT * FROM pemesanan
            WHERE id_ruangan = ?
              AND tanggal = ?
              AND id_pemesanan != ?
              AND (
                (jam_mulai <= ? AND jam_selesai > ?) OR 
                (jam_mulai < ? AND jam_selesai >= ?) OR 
                (jam_mulai >= ? AND jam_selesai <= ?)
              )
            `,
            [id_ruangan, tanggal, id, jam_mulai, jam_mulai, jam_selesai, jam_selesai, jam_mulai, jam_selesai]
        );
        if (pemesananKonflik.length > 0) {
            console.log(`[${timestamp} WITA] Ruangan ${id_ruangan} sudah dipesan untuk waktu ${jam_mulai} - ${jam_selesai}.`);
            return res.status(400).json({ message: "Ruangan sudah dipesan untuk waktu tersebut" });
        }

        await db.query(
            `UPDATE pemesanan SET id_kelas = ?, id_ruangan = ?, id_matkul = ?, id_dosen = ?, hari = ?, jam_mulai = ?, jam_selesai = ?, tanggal = ?, keterangan = ?, id_pengguna = ?, status = ? WHERE id_pemesanan = ?`,
            [id_kelas, id_ruangan, id_matkul, id_dosen, hari, jam_mulai, jam_selesai, tanggal, keterangan || null, id_pengguna, status, id]
        );

        console.log(`[${timestamp} WITA] Pemesanan dengan ID ${id} berhasil diperbarui`);
        res.status(200).json({ message: 'Pemesanan berhasil diperbarui' });
    } catch (error) {
        console.error(`[${timestamp} WITA] Gagal memperbarui pemesanan:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
    }
}

  static async getMyBookings(req, res) {
    const { id_kelas } = req.user;
    const timestamp = getTimestamp();

    try {
      console.log(`[${timestamp} WITA] Fetching bookings for id_kelas:`, id_kelas);
      const [bookings] = await db.query(
        `
        SELECT 
          p.*, 
          r.nama_ruangan, 
          r.lokasi, 
          m.nama_matkul, 
          d.nama_dosen, 
          k.nama_kelas,
          CONCAT(p.tanggal, ' ', p.jam_mulai) AS waktu_mulai,
          CONCAT(p.tanggal, ' ', p.jam_selesai) AS waktu_selesai
        FROM pemesanan p
        LEFT JOIN ruangan r ON p.id_ruangan = r.id_ruangan
        LEFT JOIN mata_kuliah m ON p.id_matkul = m.id_matkul
        LEFT JOIN dosen d ON p.id_dosen = d.id_dosen
        LEFT JOIN kelas k ON p.id_kelas = k.id_kelas
        WHERE p.id_kelas = ?
        `,
        [id_kelas]
      );

      console.log(`[${timestamp} WITA] Pemesanan untuk id_kelas ${id_kelas} berhasil diambil:`, bookings.length);
      res.status(200).json(bookings);
    } catch (error) {
      console.error(`[${timestamp} WITA] Error fetching my bookings:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async getBookingsAdmin(req, res) {
    const status = req.query.status || null;
    const tanggal = req.query.tanggal || null;
    const timestamp = getTimestamp();

    console.log(`[${timestamp} WITA] Memulai getBookingsAdmin dengan query: status=${status}, tanggal=${tanggal}`);

    try {
      let query = `
        SELECT p.id_pemesanan AS id, 
               p.id_ruangan,
               p.id_pengguna,
               k.nama_kelas,
               r.nama_ruangan,
               m.nama_matkul,
               d.kode_dosen,
               d.nama_dosen,
               COALESCE(p2.nama_prodi, 'N/A') AS nama_prodi,
               CONCAT(p.tanggal, ' ', p.jam_mulai) AS waktu_mulai,
               CONCAT(p.tanggal, ' ', p.jam_selesai) AS waktu_selesai,
               p.status,
               p.keterangan,
               p.dibuat_pada
        FROM pemesanan p
        LEFT JOIN kelas k ON p.id_kelas = k.id_kelas
        LEFT JOIN ruangan r ON p.id_ruangan = r.id_ruangan
        LEFT JOIN mata_kuliah m ON p.id_matkul = m.id_matkul
        LEFT JOIN dosen d ON p.id_dosen = d.id_dosen
        LEFT JOIN prodi p2 ON d.prodi = p2.id_prodi
      `;
      let params = [];
      let conditions = [];

      if (status) {
        conditions.push(`p.status = ?`);
        params.push(status);
      }

      if (tanggal) {
        conditions.push(`p.tanggal = ?`);
        params.push(tanggal);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }

      query += ` ORDER BY p.dibuat_pada DESC`;

      console.log(`[${timestamp} WITA] Query yang akan dijalankan:`, query);
      console.log(`[${timestamp} WITA] Parameter query:`, params);

      const [bookings] = await db.query(query, params);
      console.log(`[${timestamp} WITA] Pemesanan untuk admin berhasil diambil:`, bookings.length);
      res.status(200).json(bookings);
    } catch (error) {
      console.error(`[${timestamp} WITA] Error fetching bookings for admin:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async updateBookingStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const timestamp = getTimestamp();

    try {
      const validStatuses = ['diproses', 'disetujui', 'ditolak', 'Selesai'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Status tidak valid' });
      }

      const query = 'UPDATE pemesanan SET status = ? WHERE id_pemesanan = ?';
      const [result] = await db.query(query, [status, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Pemesanan tidak ditemukan' });
      }

      console.log(`[${timestamp} WITA] Status pemesanan ${id} diperbarui menjadi ${status}`);
      res.status(200).json({ message: 'Status pemesanan berhasil diperbarui' });
    } catch (error) {
      console.error(`[${timestamp} WITA] Error updating booking status for ID ${id}:`, error);
      res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
    }
  }

  static async getAvailableRooms(req, res) {
    const { hari, tanggal, jam_mulai, jam_selesai } = req.query;
    const timestamp = getTimestamp();

    try {
        if (!hari || !tanggal || !jam_mulai || !jam_selesai) {
            console.log(`[${timestamp} WITA] Validasi gagal: Parameter hari, tanggal, jam_mulai, dan jam_selesai wajib diisi.`);
            return res.status(400).json({ message: "Parameter hari, tanggal, jam_mulai, dan jam_selesai wajib diisi" });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!dateRegex.test(tanggal)) {
            console.log(`[${timestamp} WITA] Validasi gagal: Format tanggal tidak valid.`);
            return res.status(400).json({ message: "Format tanggal tidak valid. Gunakan YYYY-MM-DD." });
        }
        if (!timeRegex.test(jam_mulai) || !timeRegex.test(jam_selesai)) {
            console.log(`[${timestamp} WITA] Validasi gagal: Format jam tidak valid.`);
            return res.status(400).json({ message: "Format jam tidak valid. Gunakan HH:mm." });
        }

        if (jam_mulai >= jam_selesai) {
            console.log(`[${timestamp} WITA] Validasi gagal: Waktu selesai harus lebih besar dari waktu mulai.`);
            return res.status(400).json({ message: "Waktu selesai harus lebih besar dari waktu mulai" });
        }

        const [ruangan] = await db.query("SELECT id_ruangan, nama_ruangan, lokasi FROM ruangan");

        const availableRooms = [];
        for (const room of ruangan) {
            const [jadwalKonflik] = await db.query(
                `
                SELECT kj.*, jsc.status AS temp_status, jsc.jam_mulai_baru, jsc.jam_selesai_baru
                FROM kelas_jadwal kj
                LEFT JOIN jadwal_status_changes jsc 
                    ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal 
                    AND jsc.tanggal = ?
                WHERE kj.id_ruangan = ? 
                    AND kj.hari = ?
                `,
                [tanggal, room.id_ruangan, hari]
            );

            let hasConflict = false;
            for (const jadwal of jadwalKonflik) {
                const jadwalJamMulai = jadwal.temp_status === 'Tunda' && jadwal.jam_mulai_baru ? jadwal.jam_mulai_baru : jadwal.jam_mulai;
                const jadwalJamSelesai = jadwal.temp_status === 'Tunda' && jadwal.jam_selesai_baru ? jadwal.jam_selesai_baru : jadwal.jam_selesai;

                if (jadwal.temp_status === 'Libur') continue;

                const conflictExists = (
                    (jadwalJamMulai <= jam_mulai && jadwalJamSelesai > jam_mulai) ||
                    (jadwalJamMulai < jam_selesai && jadwalJamSelesai >= jam_selesai) ||
                    (jadwalJamMulai >= jam_mulai && jadwalJamSelesai <= jam_selesai)
                );

                if (conflictExists) {
                    hasConflict = true;
                    console.log(`[${timestamp} WITA] Konflik jadwal ditemukan untuk ruangan ${room.id_ruangan} pada ${tanggal} ${jam_mulai}-${jam_selesai}`);
                    break;
                }
            }

            if (hasConflict) continue;

            const [pemesananKonflik] = await db.query(
                `
                SELECT * FROM pemesanan
                WHERE id_ruangan = ?
                    AND tanggal = ?
                    AND (
                        (jam_mulai <= ? AND jam_selesai > ?) OR 
                        (jam_mulai < ? AND jam_selesai >= ?) OR 
                        (jam_mulai >= ? AND jam_selesai <= ?)
                    )
                `,
                [room.id_ruangan, tanggal, jam_mulai, jam_mulai, jam_selesai, jam_selesai, jam_mulai, jam_selesai]
            );

            if (pemesananKonflik.length === 0) {
                console.log(`[${timestamp} WITA] Ruangan ${room.id_ruangan} tersedia untuk ${tanggal} ${jam_mulai}-${jam_selesai}`);
                availableRooms.push(room);
            } else {
                console.log(`[${timestamp} WITA] Konflik pemesanan ditemukan untuk ruangan ${room.id_ruangan} pada ${tanggal} ${jam_mulai}-${jam_selesai}`);
            }
        }

        console.log(`[${timestamp} WITA] Ruangan tersedia ditemukan:`, availableRooms.length);
        res.status(200).json(availableRooms);
    } catch (error) {
        console.error(`[${timestamp} WITA] Error fetching available rooms:`, error);
        res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
}

  static async delete(req, res) {
    const { id } = req.params;
    const user = req.user;
    const timestamp = getTimestamp();

    try {
        // Validasi pengguna
        if (!user || (user.peran !== "ketua" && user.peran !== "sekretaris" && user.peran !== "admin")) {
            console.log(`[${timestamp} WITA] Akses ditolak: Hanya ketua, sekretaris, atau admin yang dapat menghapus pemesanan.`);
            return res.status(403).json({ message: "Hanya ketua, sekretaris, atau admin yang dapat menghapus pemesanan" });
        }

        // Cek apakah pemesanan ada
        const [pemesanan] = await db.query("SELECT * FROM pemesanan WHERE id_pemesanan = ?", [id]);
        if (pemesanan.length === 0) {
            console.log(`[${timestamp} WITA] Pemesanan dengan ID ${id} tidak ditemukan`);
            return res.status(404).json({ message: "Pemesanan tidak ditemukan" });
        }

        // Pastikan pengguna memiliki hak untuk menghapus (hanya admin atau pembuat pemesanan)
        if (user.peran !== "admin" && pemesanan[0].id_pengguna !== user.id_pengguna) {
            console.log(`[${timestamp} WITA] Akses ditolak: Pengguna bukan admin atau pembuat pemesanan ${id}`);
            return res.status(403).json({ message: "Hanya admin atau pembuat pemesanan yang dapat menghapus" });
        }

        // Hapus pemesanan
        await db.query("DELETE FROM pemesanan WHERE id_pemesanan = ?", [id]);

        console.log(`[${timestamp} WITA] Pemesanan dengan ID ${id} berhasil dihapus oleh ${user.id_pengguna}`);
        res.status(200).json({ message: "Pemesanan berhasil dihapus" });
    } catch (error) {
        console.error(`[${timestamp} WITA] Error deleting pemesanan with ID ${id}:`, error);
        res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
}
}

module.exports = PemesananController;