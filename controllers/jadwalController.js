// controllers/jadwalController.js

const db = require("../config/db");

class JadwalController {
  static async getAll(req, res) {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  const hari = req.query.hari || new Date().toLocaleString("id-ID", { weekday: "long", timeZone: 'Asia/Makassar' });
  const tanggalDefault = req.query.tanggal || new Date().toISOString().split('T')[0];
  const formattedHari = hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase();
  const user = req.user;
  const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Makassar' }).slice(0, 5);
  console.log(`[${timestamp} WITA] Mengambil jadwal untuk hari: ${formattedHari}, tanggal: ${tanggalDefault}, user: ${JSON.stringify(user)}`);

  try {
    if (user.peran !== "ketua" && user.peran !== "sekretaris") {
      console.log(`[${timestamp} WITA] Akses ditolak: Peran pengguna bukan ketua/sekretaris`);
      return res.status(403).json({ message: "Hanya ketua/sekretaris yang dapat mengakses jadwal kelas mereka" });
    }

    if (!user.id_kelas) {
      console.log(`[${timestamp} WITA] Error: Akun pengguna tidak terkait dengan kelas`);
      return res.status(400).json({ message: "Akun Anda tidak terkait dengan kelas. Hubungi admin." });
    }

    const [jadwals] = await db.query(
      `
      SELECT 
        kj.id_kelas_jadwal AS id,
        kj.id_ruangan,
        k.nama_kelas,
        r.nama_ruangan,
        m.nama_matkul,
        d.nama_dosen,
        kj.hari,
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_mulai_baru IS NOT NULL THEN jsc.jam_mulai_baru
          ELSE kj.jam_mulai
        END AS jam_mulai,
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_selesai_baru IS NOT NULL THEN jsc.jam_selesai_baru
          ELSE kj.jam_selesai
        END AS jam_selesai,
        COALESCE(jsc.status, kj.status) AS status
      FROM kelas_jadwal kj
      LEFT JOIN jadwal_status_changes jsc 
        ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal 
        AND jsc.tanggal = ?
      LEFT JOIN kelas k ON kj.id_kelas = k.id_kelas
      LEFT JOIN ruangan r ON kj.id_ruangan = r.id_ruangan
      LEFT JOIN mata_kuliah m ON kj.id_matkul = m.id_matkul
      LEFT JOIN dosen d ON kj.id_dosen = d.id_dosen
      WHERE kj.hari = ? 
      AND kj.id_kelas = ?
      AND (kj.status = 'Masuk' OR kj.status = 'Tunda')
      `,
      [tanggalDefault, formattedHari, user.id_kelas]
    );

    const [pemesanans] = await db.query(
      `
      SELECT 
        p.id_pemesanan AS id,
        p.id_ruangan,
        k.nama_kelas,
        r.nama_ruangan,
        m.nama_matkul,
        d.nama_dosen,
        DATE(p.tanggal) AS tanggal_raw, -- Ambil hanya tanggal
        p.jam_mulai,
        p.jam_selesai,
        p.status
      FROM pemesanan p
      LEFT JOIN kelas k ON p.id_kelas = k.id_kelas
      LEFT JOIN ruangan r ON p.id_ruangan = r.id_ruangan
      LEFT JOIN mata_kuliah m ON p.id_matkul = m.id_matkul
      LEFT JOIN dosen d ON p.id_dosen = d.id_dosen
      WHERE p.tanggal = ? 
        AND p.id_kelas = ?
        AND p.status = 'disetujui'
        AND p.jam_mulai <= ? 
        AND p.jam_selesai > ?
      `,
      [tanggalDefault, user.id_kelas, currentTime, currentTime]
    );

    const combinedJadwal = [
      ...jadwals.map(j => ({
        ...j,
        jam_mulai: j.jam_mulai.toString().slice(0, 5),
        jam_selesai: j.jam_selesai.toString().slice(0, 5),
      })),
      ...pemesanans.map(p => {
        const hari = new Date(p.tanggal_raw).toLocaleString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' });
        return {
          id: p.id,
          id_ruangan: p.id_ruangan,
          nama_kelas: p.nama_kelas,
          nama_ruangan: p.nama_ruangan,
          nama_matkul: p.nama_matkul,
          nama_dosen: p.nama_dosen,
          hari: hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase(),
          jam_mulai: p.jam_mulai.toString().slice(0, 5),
          jam_selesai: p.jam_selesai.toString().slice(0, 5),
          status: p.status === 'disetujui' ? 'Terisi (Pemesanan)' : p.status,
        };
      }),
    ];

    console.log(`[${timestamp} WITA] Raw jadwal data sebelum transformasi:`, combinedJadwal);
    console.log(`[${timestamp} WITA] Jadwal ditemukan: ${combinedJadwal.length}`, combinedJadwal);

    const formattedJadwal = combinedJadwal.map(j => ({
      ...j,
      jam_mulai: j.jam_mulai.toString().slice(0, 5),
      jam_selesai: j.jam_selesai.toString().slice(0, 5),
    }));

    res.status(200).json(formattedJadwal);
  } catch (error) {
    console.error(`[${timestamp} WITA] Error fetching jadwal untuk hari ${formattedHari}:`, error);
    res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
  }
}

  static async getAllPublic(req, res) {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  const hari = req.query.hari || new Date().toLocaleString("id-ID", { weekday: "long", timeZone: 'Asia/Makassar' });
  const tanggal = req.query.tanggal || new Date().toLocaleString('en-US', { timeZone: 'Asia/Makassar' }).split(' ')[0].replace(/\//g, '-');
  const waktu = req.query.waktu || new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Makassar' }).slice(0, 5);
  const formattedHari = hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase();
  console.log(`[${timestamp} WITA] Menerima permintaan jadwal publik untuk hari: ${formattedHari}, tanggal: ${tanggal}, waktu: ${waktu}`);

  try {
    const [jadwals] = await db.query(
      `
      SELECT 
        kj.id_kelas_jadwal AS id,
        kj.id_ruangan,
        k.nama_kelas,
        r.nama_ruangan,
        m.nama_matkul,
        d.nama_dosen,
        kj.hari,
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_mulai_baru IS NOT NULL THEN jsc.jam_mulai_baru
          ELSE kj.jam_mulai
        END AS jam_mulai,
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_selesai_baru IS NOT NULL THEN jsc.jam_selesai_baru
          ELSE kj.jam_selesai
        END AS jam_selesai,
        COALESCE(jsc.status, kj.status) AS status
      FROM kelas_jadwal kj
      LEFT JOIN jadwal_status_changes jsc ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal AND jsc.tanggal = ?
      LEFT JOIN kelas k ON kj.id_kelas = k.id_kelas
      LEFT JOIN ruangan r ON kj.id_ruangan = r.id_ruangan
      LEFT JOIN mata_kuliah m ON kj.id_matkul = m.id_matkul
      LEFT JOIN dosen d ON kj.id_dosen = d.id_dosen
      WHERE kj.hari = ? AND (kj.status = 'Masuk' OR kj.status = 'Tunda')
      `,
      [tanggal, formattedHari]
    );

    const [pemesanans] = await db.query(
      `
      SELECT 
        p.id_pemesanan AS id,
        p.id_ruangan,
        k.nama_kelas,
        r.nama_ruangan,
        m.nama_matkul,
        d.nama_dosen,
        DATE(p.tanggal) AS tanggal_raw, -- Ambil hanya tanggal
        p.jam_mulai,
        p.jam_selesai,
        p.status
      FROM pemesanan p
      LEFT JOIN kelas k ON p.id_kelas = k.id_kelas
      LEFT JOIN ruangan r ON p.id_ruangan = r.id_ruangan
      LEFT JOIN mata_kuliah m ON p.id_matkul = m.id_matkul
      LEFT JOIN dosen d ON p.id_dosen = d.id_dosen
      WHERE p.tanggal = ? AND p.status = 'disetujui'
        AND p.jam_mulai <= ? AND p.jam_selesai > ?
      `,
      [tanggal, waktu, waktu]
    );

    const combinedJadwal = [
      ...jadwals
        .filter(j => j.jam_mulai > waktu && j.jam_selesai > waktu)
        .map(j => ({
          ...j,
          jam_mulai: j.jam_mulai.toString().slice(0, 5),
          jam_selesai: j.jam_selesai.toString().slice(0, 5),
        })),
      ...pemesanans
        .filter(p => p.jam_mulai > waktu && p.jam_selesai > waktu)
        .map(p => {
          const hari = new Date(p.tanggal_raw).toLocaleString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' });
          return {
            id: p.id,
            id_ruangan: p.id_ruangan,
            nama_kelas: p.nama_kelas,
            nama_ruangan: p.nama_ruangan,
            nama_matkul: p.nama_matkul,
            nama_dosen: p.nama_dosen,
            hari: hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase(),
            jam_mulai: p.jam_mulai.toString().slice(0, 5),
            jam_selesai: p.jam_selesai.toString().slice(0, 5),
            status: p.status === 'disetujui' ? 'Terisi (Pemesanan)' : p.status,
          };
        }),
    ];

    console.log(`[${timestamp} WITA] Jadwal publik ditemukan: ${combinedJadwal.length}`, combinedJadwal);
    res.status(200).json(combinedJadwal);
  } catch (error) {
    console.error(`[${timestamp} WITA] Error fetching public jadwal untuk hari ${formattedHari}:`, error);
    res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
  }
}

  static async getAllAdmin(req, res) {
  const hari = req.query.hari || null;
  const status = req.query.status || null;
  const tanggalDefault = req.query.tanggal || new Date().toLocaleString('en-US', { timeZone: 'Asia/Makassar' }).split(' ')[0].replace(/\//g, '-');
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  const currentTime = req.query.time || new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Makassar' }).slice(0, 5);
  console.log(`[${timestamp} WITA] Mengambil semua jadwal untuk admin${hari ? ` pada hari ${hari}` : ""}${status ? ` dengan status ${status}` : ""}`);

  try {
    let jadwalQuery = `
      SELECT 
        j.id_kelas_jadwal AS id,
        j.id_kelas,
        j.id_matkul,
        j.id_dosen,
        j.id_ruangan,
        k.nama_kelas,
        r.nama_ruangan,
        m.nama_matkul,
        d.kode_dosen,
        d.nama_dosen,
        j.hari,
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_mulai_baru IS NOT NULL THEN jsc.jam_mulai_baru
          ELSE j.jam_mulai
        END AS jam_mulai,
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_selesai_baru IS NOT NULL THEN jsc.jam_selesai_baru
          ELSE j.jam_selesai
        END AS jam_selesai,
        COALESCE(jsc.status, j.status) AS status
      FROM kelas_jadwal j
      LEFT JOIN jadwal_status_changes jsc ON j.id_kelas_jadwal = jsc.id_kelas_jadwal AND jsc.tanggal = ?
      LEFT JOIN kelas k ON j.id_kelas = k.id_kelas
      LEFT JOIN ruangan r ON j.id_ruangan = r.id_ruangan
      LEFT JOIN mata_kuliah m ON j.id_matkul = m.id_matkul
      LEFT JOIN dosen d ON j.id_dosen = d.id_dosen
    `;
    let jadwalParams = [tanggalDefault];
    let jadwalConditions = [];

    let pemesananQuery = `
      SELECT 
        p.id_pemesanan AS id,
        p.id_kelas,
        p.id_matkul,
        p.id_dosen,
        p.id_ruangan,
        k.nama_kelas,
        r.nama_ruangan,
        m.nama_matkul,
        d.kode_dosen,
        d.nama_dosen,
        DATE(p.tanggal) AS tanggal_raw, -- Ambil hanya tanggal
        p.jam_mulai,
        p.jam_selesai,
        p.status
      FROM pemesanan p
      LEFT JOIN kelas k ON p.id_kelas = k.id_kelas
      LEFT JOIN ruangan r ON p.id_ruangan = r.id_ruangan
      LEFT JOIN mata_kuliah m ON p.id_matkul = m.id_matkul
      LEFT JOIN dosen d ON p.id_dosen = d.id_dosen
      WHERE p.tanggal = ? AND p.status = 'disetujui'
    `;
    let pemesananParams = [tanggalDefault];
    let pemesananConditions = [];

    if (hari) {
      const formattedHari = hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase();
      jadwalConditions.push(`j.hari = ?`);
      jadwalParams.push(formattedHari);
      pemesananConditions.push(`DATE(p.tanggal) = ?`);
      pemesananParams.push(tanggalDefault); // Sesuaikan dengan tanggal, bukan nama hari
    }

    if (status) {
      jadwalConditions.push(`COALESCE(jsc.status, j.status) = ?`);
      jadwalParams.push(status);
      pemesananConditions.push(`p.status = 'disetujui'`);
    }

    if (jadwalConditions.length > 0) {
      jadwalQuery += ` WHERE ${jadwalConditions.join(" AND ")}`;
    }

    if (pemesananConditions.length > 0) {
      pemesananQuery += ` AND ${pemesananConditions.join(" AND ")}`;
    }

    const [jadwals] = await db.query(jadwalQuery, jadwalParams);
    const [pemesanans] = await db.query(pemesananQuery, pemesananParams);

    const combinedJadwal = [
      ...jadwals.map(j => ({
        ...j,
        jam_mulai: j.jam_mulai.toString().slice(0, 5),
        jam_selesai: j.jam_selesai.toString().slice(0, 5),
      })),
      ...pemesanans.map(p => {
        const hari = new Date(p.tanggal_raw).toLocaleString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' });
        return {
          id: p.id,
          id_kelas: p.id_kelas,
          id_matkul: p.id_matkul,
          id_dosen: p.id_dosen,
          id_ruangan: p.id_ruangan,
          nama_kelas: p.nama_kelas,
          nama_ruangan: p.nama_ruangan,
          nama_matkul: p.nama_matkul,
          kode_dosen: p.kode_dosen,
          nama_dosen: p.nama_dosen,
          hari: hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase(),
          jam_mulai: p.jam_mulai.toString().slice(0, 5),
          jam_selesai: p.jam_selesai.toString().slice(0, 5),
          status: p.status === 'disetujui' ? 'Terisi (Pemesanan)' : p.status,
        };
      }),
    ];

    console.log(`[${timestamp} WITA] Jadwal admin ditemukan: ${combinedJadwal.length}`, combinedJadwal);
    res.status(200).json(combinedJadwal);
  } catch (error) {
    console.error(`[${timestamp} WITA] Error fetching all jadwal for admin:`, error);
    res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
  }
}

  static async getById(req, res) {
    const { id } = req.params;
    console.log(`Mengambil jadwal dengan ID: ${id}`);

    try {
      const [jadwal] = await db.query(
        `
        SELECT j.id_kelas_jadwal AS id, 
               k.nama_kelas, 
               r.nama_ruangan, 
               m.nama_matkul, 
               d.kode_dosen AS kode_dosen,
               d.nama_dosen,
               p.nama_prodi,
               j.hari, 
               j.jam_mulai, 
               j.jam_selesai,
               j.status,
               j.id_kelas,
               j.id_ruangan,
               j.id_dosen,
               j.id_matkul
        FROM kelas_jadwal j
        LEFT JOIN kelas k ON j.id_kelas = k.id_kelas
        LEFT JOIN ruangan r ON j.id_ruangan = r.id_ruangan
        LEFT JOIN mata_kuliah m ON j.id_matkul = m.id_matkul
        LEFT JOIN dosen d ON j.id_dosen = d.id_dosen
        LEFT JOIN prodi p ON d.id_prodi = p.id_prodi
        WHERE j.id_kelas_jadwal = ?
      `,
        [id]
      );
      if (!jadwal.length) {
        return res.status(404).json({ message: "Jadwal tidak ditemukan" });
      }
      res.status(200).json(jadwal[0]);
    } catch (error) {
      console.error(`Error fetching jadwal by ID ${id}:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async create(req, res) {
  const { id_kelas, id_matkul, id_dosen, id_ruangan, hari, jam_mulai, jam_selesai, status } = req.body;
  const user = req.user;
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  const currentDate = new Date().toISOString().split('T')[0]; // Tanggal saat ini: 2025-06-11

  try {
    if (user.peran !== "ketua" && user.peran !== "sekretaris") {
      return res.status(403).json({ message: "Hanya ketua/sekretaris yang dapat membuat jadwal" });
    }

    if (!id_kelas || !id_matkul || !id_dosen || !id_ruangan || !hari || !jam_mulai || !jam_selesai || !status) {
      console.log(`[${timestamp} WITA] Validasi gagal: Semua kolom wajib diisi.`, req.body);
      return res.status(400).json({ message: "Semua kolom wajib diisi" });
    }

    const validDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const formattedHari = hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase();
    if (!validDays.includes(formattedHari)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Hari tidak valid.`);
      return res.status(400).json({ message: "Hari tidak valid. Harus salah satu dari: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu" });
    }

    const validStatuses = ['Masuk', 'Libur', 'Tunda'];
    if (!validStatuses.includes(status)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Status tidak valid.`);
      return res.status(400).json({ message: "Status tidak valid. Harus salah satu dari: Masuk, Libur, Tunda" });
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(jam_mulai) || !timeRegex.test(jam_selesai)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Format jam tidak valid. jam_mulai=${jam_mulai}, jam_selesai=${jam_selesai}`);
      return res.status(400).json({ message: "Format jam tidak valid. Gunakan HH:mm." });
    }

    if (jam_mulai >= jam_selesai) {
      console.log(`[${timestamp} WITA] Validasi gagal: Waktu selesai harus lebih besar dari waktu mulai.`);
      return res.status(400).json({ message: "Waktu selesai harus lebih besar dari waktu mulai" });
    }

    const [pengguna] = await db.query(
      "SELECT * FROM pengguna WHERE id_pengguna = ? AND id_kelas = ? AND peran IN ('ketua', 'sekretaris')",
      [user.id_pengguna, id_kelas]
    );
    if (!pengguna.length) {
      console.log(`[${timestamp} WITA] Validasi gagal: Pengguna tidak berwenang.`);
      return res.status(403).json({ message: "Anda tidak berwenang untuk kelas ini" });
    }

    const [ruangan] = await db.query("SELECT * FROM ruangan WHERE id_ruangan = ?", [id_ruangan]);
    if (!ruangan.length) {
      console.log(`[${timestamp} WITA] Validasi gagal: Ruangan tidak ditemukan.`);
      return res.status(404).json({ message: "Ruangan tidak ditemukan" });
    }

    const [matkul] = await db.query("SELECT * FROM mata_kuliah WHERE id_matkul = ?", [id_matkul]);
    if (!matkul.length) {
      console.log(`[${timestamp} WITA] Validasi gagal: Mata kuliah tidak ditemukan.`);
      return res.status(404).json({ message: "Mata kuliah tidak ditemukan" });
    }

    const [dosen] = await db.query("SELECT * FROM dosen WHERE id_dosen = ?", [id_dosen]);
    if (!dosen.length) {
      console.log(`[${timestamp} WITA] Validasi gagal: Dosen tidak ditemukan.`);
      return res.status(404).json({ message: "Dosen tidak ditemukan" });
    }

    const [kelas] = await db.query("SELECT * FROM kelas WHERE id_kelas = ?", [id_kelas]);
    if (!kelas.length) {
      console.log(`[${timestamp} WITA] Validasi gagal: Kelas tidak ditemukan.`);
      return res.status(404).json({ message: "Kelas tidak ditemukan" });
    }

    // Cek konflik di kelas_jadwal dengan status changes
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
      [currentDate, id_ruangan, formattedHari]
    );

    let hasConflict = false;
    for (const jadwal of jadwalKonflik) {
      const jadwalJamMulai = jadwal.temp_status === 'Tunda' && jadwal.jam_mulai_baru ? jadwal.jam_mulai_baru : jadwal.jam_mulai;
      const jadwalJamSelesai = jadwal.temp_status === 'Tunda' && jadwal.jam_selesai_baru ? jadwal.jam_selesai_baru : jadwal.jam_selesai;
      const currentStatus = jadwal.temp_status || jadwal.status;

      if (currentStatus !== 'Libur' && (
        (jadwalJamMulai <= jam_selesai && jadwalJamSelesai > jam_mulai) ||
        (jadwalJamMulai < jam_selesai && jadwalJamSelesai >= jam_mulai) ||
        (jadwalJamMulai >= jam_mulai && jadwalJamSelesai <= jam_selesai)
      )) {
        hasConflict = true;
        break;
      }
    }

    if (hasConflict) {
      console.log(`[${timestamp} WITA] Validasi gagal: Ruangan ${id_ruangan} sudah terisi oleh jadwal untuk waktu ${jam_mulai} - ${jam_selesai}.`);
      return res.status(400).json({ message: "Ruangan sudah terisi oleh jadwal untuk waktu tersebut" });
    }

    // Cek konflik di pemesanan untuk tanggal saat ini
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
      [id_ruangan, currentDate, jam_mulai, jam_mulai, jam_selesai, jam_selesai, jam_mulai, jam_selesai]
    );

    if (pemesananKonflik.length > 0) {
      console.log(`[${timestamp} WITA] Validasi gagal: Ruangan ${id_ruangan} sudah dipesan untuk waktu ${jam_mulai} - ${jam_selesai}.`);
      return res.status(400).json({ message: "Ruangan sudah dipesan untuk waktu tersebut" });
    }

    // Cek konflik dosen
    const [dosenConflict] = await db.query(
      `
      SELECT kj.*, jsc.status AS temp_status, jsc.jam_mulai_baru, jsc.jam_selesai_baru
      FROM kelas_jadwal kj
      LEFT JOIN jadwal_status_changes jsc 
        ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal 
        AND jsc.tanggal = ?
      WHERE kj.id_dosen = ? 
        AND kj.hari = ?
        AND (jsc.status IS NULL OR jsc.status != 'Libur')
        AND (
          (COALESCE(jsc.jam_mulai_baru, kj.jam_mulai) <= ? AND COALESCE(jsc.jam_selesai_baru, kj.jam_selesai) > ?) OR
          (COALESCE(jsc.jam_mulai_baru, kj.jam_mulai) < ? AND COALESCE(jsc.jam_selesai_baru, kj.jam_selesai) >= ?) OR
          (COALESCE(jsc.jam_mulai_baru, kj.jam_mulai) >= ? AND COALESCE(jsc.jam_selesai_baru, kj.jam_selesai) <= ?)
        )
      `,
      [currentDate, id_dosen, formattedHari, jam_selesai, jam_mulai, jam_selesai, jam_selesai, jam_mulai, jam_selesai]
    );

    if (dosenConflict.length > 0) {
      console.log(`[${timestamp} WITA] Validasi gagal: Dosen ${id_dosen} sudah memiliki jadwal pada waktu tersebut.`);
      return res.status(400).json({ message: "Dosen sudah memiliki jadwal pada waktu tersebut" });
    }

    // Cek konflik kelas
    const [kelasConflict] = await db.query(
      `
      SELECT kj.*, jsc.status AS temp_status, jsc.jam_mulai_baru, jsc.jam_selesai_baru
      FROM kelas_jadwal kj
      LEFT JOIN jadwal_status_changes jsc 
        ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal 
        AND jsc.tanggal = ?
      WHERE kj.id_kelas = ? 
        AND kj.hari = ?
        AND (jsc.status IS NULL OR jsc.status != 'Libur')
        AND (
          (COALESCE(jsc.jam_mulai_baru, kj.jam_mulai) <= ? AND COALESCE(jsc.jam_selesai_baru, kj.jam_selesai) > ?) OR
          (COALESCE(jsc.jam_mulai_baru, kj.jam_mulai) < ? AND COALESCE(jsc.jam_selesai_baru, kj.jam_selesai) >= ?) OR
          (COALESCE(jsc.jam_mulai_baru, kj.jam_mulai) >= ? AND COALESCE(jsc.jam_selesai_baru, kj.jam_selesai) <= ?)
        )
      `,
      [currentDate, id_kelas, formattedHari, jam_selesai, jam_mulai, jam_selesai, jam_selesai, jam_mulai, jam_selesai]
    );

    if (kelasConflict.length > 0) {
      console.log(`[${timestamp} WITA] Validasi gagal: Kelas ${id_kelas} sudah memiliki jadwal pada waktu tersebut.`);
      return res.status(400).json({ message: "Kelas sudah memiliki jadwal pada waktu tersebut" });
    }

    const [result] = await db.query(
      `
      INSERT INTO kelas_jadwal (id_kelas, id_ruangan, id_dosen, id_matkul, hari, jam_mulai, jam_selesai, status, confirmed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [id_kelas, id_ruangan, id_dosen, id_matkul, formattedHari, jam_mulai, jam_selesai, status, user.id_pengguna]
    );

    console.log(`[${timestamp} WITA] Jadwal default berhasil ditambahkan dengan ID ${result.insertId}.`);
    res.status(201).json({ message: "Jadwal default berhasil ditambahkan", id: result.insertId });
  } catch (error) {
    console.error(`[${timestamp} WITA] Error creating jadwal:`, error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Data kelas, ruangan, dosen, atau mata kuliah tidak ditemukan" });
    }
    res.status(500).json({ message: "Gagal menambahkan jadwal", error: error.message });
  }
}

  static async getFilteredMatkul(req, res) {
  const { id_kelas } = req.body;
  console.log(`Mengambil mata kuliah untuk kelas ID: ${id_kelas}`);

  try {
    const [kelas] = await db.query(
      "SELECT id_prodi, semester FROM kelas WHERE id_kelas = ?",
      [id_kelas]
    );
    if (!kelas.length) {
      return res.status(404).json({ message: "Kelas tidak ditemukan" });
    }

    const [matkul] = await db.query(
      "SELECT id_matkul, nama_matkul FROM mata_kuliah WHERE id_prodi = ? AND semester = ?",
      [kelas[0].id_prodi, kelas[0].semester]
    );
    res.status(200).json(matkul);
  } catch (error) {
    console.error("Error fetching filtered matkul:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
  }
}

  static async getFilteredDosen(req, res) {
  const { id_kelas } = req.body;
  console.log(`Mengambil dosen untuk kelas ID: ${id_kelas}`);

  try {
    const [kelas] = await db.query(
      "SELECT id_prodi FROM kelas WHERE id_kelas = ?",
      [id_kelas]
    );
    if (!kelas.length) {
      return res.status(404).json({ message: "Kelas tidak ditemukan" });
    }

    const classProdi = kelas[0].id_prodi;
    const [dosen] = await db.query(
      "SELECT id_dosen, nama_dosen FROM dosen WHERE id_prodi = ? OR id_prodi = 5",
      [classProdi]
    );
    res.status(200).json(dosen);
  } catch (error) {
    console.error("Error fetching filtered dosen:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
  }
}

  static async update(req, res) {
    const { id } = req.params;
    const { id_kelas, id_matkul, id_dosen, id_ruangan, hari, jam_mulai, jam_selesai, status } = req.body;
    const user = req.user;
    console.log(`Memperbarui jadwal dengan ID: ${id}`, req.body);

    try {
      if (user.peran !== "ketua" && user.peran !== "sekretaris") {
        return res.status(403).json({ message: "Hanya ketua/sekretaris yang dapat mengedit jadwal" });
      }

      if (!id_kelas || !id_matkul || !id_dosen || !id_ruangan || !hari || !jam_mulai || !jam_selesai || !status) {
        return res.status(400).json({ message: "Semua kolom wajib diisi" });
      }

      const validDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      const formattedHari = hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase();
      if (!validDays.includes(formattedHari)) {
        return res.status(400).json({ message: "Hari tidak valid. Harus salah satu dari: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu" });
      }

      const validStatuses = ['Masuk', 'Libur', 'Tunda'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Status tidak valid. Harus salah satu dari: Masuk, Libur, Tunda" });
      }

      if (jam_mulai >= jam_selesai) {
        return res.status(400).json({ message: "Jam mulai harus lebih awal dari jam selesai" });
      }

      const [jadwal] = await db.query("SELECT * FROM kelas_jadwal WHERE id_kelas_jadwal = ?", [id]);
      if (!jadwal.length) {
        return res.status(404).json({ message: "Jadwal tidak ditemukan" });
      }

      const [pengguna] = await db.query(
        "SELECT * FROM pengguna WHERE id_pengguna = ? AND id_kelas = ? AND peran IN ('ketua', 'sekretaris')",
        [user.id_pengguna, id_kelas]
      );
      if (!pengguna.length) {
        return res.status(403).json({ message: "Anda tidak berwenang untuk kelas ini" });
      }

      const [roomConflict] = await db.query(
        `
        SELECT * FROM kelas_jadwal
        WHERE id_ruangan = ? AND hari = ? AND status = 'Masuk' AND id_kelas_jadwal != ?
        AND ((jam_mulai <= ? AND jam_selesai > ?) OR (jam_mulai < ? AND jam_selesai >= ?))
      `,
        [id_ruangan, formattedHari, id, jam_mulai, jam_mulai, jam_selesai, jam_selesai]
      );
      if (roomConflict.length > 0) {
        return res.status(400).json({ message: "Ruangan sudah digunakan pada waktu tersebut" });
      }

      const [dosenConflict] = await db.query(
        `
        SELECT * FROM kelas_jadwal
        WHERE id_dosen = ? AND hari = ? AND status = 'Masuk' AND id_kelas_jadwal != ?
        AND ((jam_mulai <= ? AND jam_selesai > ?) OR (jam_mulai < ? AND jam_selesai >= ?))
      `,
        [id_dosen, formattedHari, id, jam_mulai, jam_mulai, jam_selesai, jam_selesai]
      );
      if (dosenConflict.length > 0) {
        return res.status(400).json({ message: "Dosen sudah memiliki jadwal pada waktu tersebut" });
      }

      const [kelasConflict] = await db.query(
        `
        SELECT * FROM kelas_jadwal
        WHERE id_kelas = ? AND hari = ? AND status = 'Masuk' AND id_kelas_jadwal != ?
        AND ((jam_mulai <= ? AND jam_selesai > ?) OR (jam_mulai < ? AND jam_selesai >= ?))
      `,
        [id_kelas, formattedHari, id, jam_mulai, jam_mulai, jam_selesai, jam_selesai]
      );
      if (kelasConflict.length > 0) {
        return res.status(400).json({ message: "Kelas sudah memiliki jadwal pada waktu tersebut" });
      }

      const [result] = await db.query(
        `
        UPDATE kelas_jadwal 
        SET id_kelas = ?, id_ruangan = ?, id_dosen = ?, id_matkul = ?, hari = ?, jam_mulai = ?, jam_selesai = ?, status = ?, confirmed_by = ?
        WHERE id_kelas_jadwal = ?
      `,
        [id_kelas, id_ruangan, id_dosen, id_matkul, formattedHari, jam_mulai, jam_selesai, status, user.id_pengguna, id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Jadwal tidak ditemukan" });
      }
      res.status(200).json({ message: "Jadwal default berhasil diperbarui" });
    } catch (error) {
      console.error("Error updating jadwal:", error);
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(400).json({ message: "Data kelas, ruangan, dosen, atau mata kuliah tidak ditemukan" });
      }
      res.status(500).json({ message: "Gagal memperbarui jadwal", error: error.message });
    }
  }

  static async delete(req, res) {
  const { id } = req.params;
  const user = req.user;
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  console.log(`[${timestamp} WITA] Menghapus jadwal dengan ID: ${id}`);

  try {
    if (!id || isNaN(id) || parseInt(id) <= 0) {
      console.log(`[${timestamp} WITA] Validasi gagal: ID jadwal tidak valid: ${id}`);
      return res.status(400).json({ message: "ID jadwal tidak valid" });
    }

    const [jadwal] = await db.query("SELECT * FROM kelas_jadwal WHERE id_kelas_jadwal = ?", [id]);
    if (!jadwal.length) {
      console.log(`[${timestamp} WITA] Jadwal tidak ditemukan untuk ID: ${id}`);
      return res.status(404).json({ message: "Jadwal tidak ditemukan" });
    }

    if (user.peran !== "admin") {
      const [pengguna] = await db.query(
        "SELECT * FROM pengguna WHERE id_pengguna = ? AND id_kelas = ? AND peran IN ('ketua', 'sekretaris')",
        [user.id_pengguna, jadwal[0].id_kelas]
      );
      if (!pengguna.length) {
        console.log(`[${timestamp} WITA] Otorisasi gagal: Pengguna tidak berwenang untuk kelas ID: ${jadwal[0].id_kelas}`);
        return res.status(403).json({ message: "Anda tidak berwenang untuk kelas ini" });
      }
    }

    await db.query("DELETE FROM kelas_jadwal WHERE id_kelas_jadwal = ?", [id]);
    console.log(`[${timestamp} WITA] Jadwal dengan ID: ${id} berhasil dihapus`);
    res.status(200).json({ message: "Jadwal berhasil dihapus" });
  } catch (error) {
    console.error(`[${timestamp} WITA] Error deleting jadwal:`, error);
    res.status(500).json({ message: "Gagal menghapus jadwal", error: error.message });
  }
}

  static async getMatkulByProdi(req, res) {
    const { prodi } = req.query;
    try {
      console.log(`Mengambil mata kuliah untuk prodi: ${prodi}`);
      const [matkul] = await db.query("SELECT * FROM mata_kuliah WHERE prodi = ?", [prodi]);
      res.status(200).json(matkul);
    } catch (error) {
      console.error("Error fetching matkul by prodi:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async confirmJadwal(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id_pengguna;
    console.log(`Mengonfirmasi jadwal dengan ID: ${id}, status: ${status}, oleh user: ${userId}`);

    try {
      const validStatuses = ['Masuk', 'Libur', 'Tunda'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Status tidak valid. Harus salah satu dari: Masuk, Libur, Tunda" });
      }

      const [jadwal] = await db.query("SELECT id_kelas FROM kelas_jadwal WHERE id_kelas_jadwal = ?", [id]);
      if (!jadwal.length) {
        return res.status(404).json({ message: "Jadwal tidak ditemukan" });
      }

      const [pengguna] = await db.query(
        "SELECT * FROM pengguna WHERE id_pengguna = ? AND id_kelas = ? AND peran IN ('ketua', 'sekretaris')",
        [userId, jadwal[0].id_kelas]
      );
      if (!pengguna.length) {
        return res.status(403).json({ message: "Anda tidak berhak mengonfirmasi jadwal ini" });
      }

      const [result] = await db.query(
        "UPDATE kelas_jadwal SET status = ?, confirmed_by = ? WHERE id_kelas_jadwal = ?",
        [status, userId, id]
      );
      if (result.affectedRows === 0) {
        return res.status(500).json({ message: "Gagal mengonfirmasi jadwal" });
      }
      res.status(200).json({ message: "Status jadwal berhasil diperbarui" });
    } catch (error) {
      console.error("Error confirming jadwal:", error);
      res.status(500).json({ message: "Gagal mengonfirmasi jadwal", error: error.message });
    }
  }

  static async getAvailableRooms(req, res) {
  const { hari, jam_mulai, jam_selesai } = req.query;
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  const currentDate = new Date().toISOString().split('T')[0]; // Tanggal saat ini: 2025-06-11

  try {
    if (!hari || !jam_mulai || !jam_selesai) {
      console.log(`[${timestamp} WITA] Validasi gagal: Parameter hari, jam_mulai, dan jam_selesai wajib diisi.`);
      return res.status(400).json({ message: "Parameter hari, jam_mulai, dan jam_selesai wajib diisi" });
    }

    const validDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const formattedHari = hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase();
    if (!validDays.includes(formattedHari)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Hari tidak valid.`);
      return res.status(400).json({ message: "Hari tidak valid. Harus salah satu dari: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu" });
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(jam_mulai) || !timeRegex.test(jam_selesai)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Format jam tidak valid. jam_mulai=${jam_mulai}, jam_selesai=${jam_selesai}`);
      return res.status(400).json({ message: "Format jam tidak valid. Gunakan HH:mm." });
    }

    if (jam_mulai >= jam_selesai) {
      console.log(`[${timestamp} WITA] Validasi gagal: Waktu selesai harus lebih besar dari waktu mulai.`);
      return res.status(400).json({ message: "Waktu selesai harus lebih besar dari waktu mulai" });
    }

    const [ruangan] = await db.query("SELECT id_ruangan, nama_ruangan FROM ruangan");

    const availableRooms = [];
    for (const room of ruangan) {
      // Cek konflik di kelas_jadwal
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
        [currentDate, room.id_ruangan, formattedHari]
      );

      let hasConflict = false;
      for (const jadwal of jadwalKonflik) {
        const jadwalJamMulai = jadwal.temp_status === 'Tunda' && jadwal.jam_mulai_baru ? jadwal.jam_mulai_baru : jadwal.jam_mulai;
        const jadwalJamSelesai = jadwal.temp_status === 'Tunda' && jadwal.jam_selesai_baru ? jadwal.jam_selesai_baru : jadwal.jam_selesai;
        const currentStatus = jadwal.temp_status || jadwal.status;

        if (currentStatus !== 'Libur' && (
          (jadwalJamMulai <= jam_selesai && jadwalJamSelesai > jam_mulai) ||
          (jadwalJamMulai < jam_selesai && jadwalJamSelesai >= jam_mulai) ||
          (jadwalJamMulai >= jam_mulai && jadwalJamSelesai <= jam_selesai)
        )) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict) continue;

      // Cek konflik di pemesanan untuk tanggal saat ini
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
        [room.id_ruangan, currentDate, jam_mulai, jam_mulai, jam_selesai, jam_selesai, jam_mulai, jam_selesai]
      );

      if (pemesananKonflik.length === 0) {
        availableRooms.push({
          id_ruangan: room.id_ruangan,
          nama_ruangan: room.nama_ruangan,
        });
      }
    }

    console.log(`[${timestamp} WITA] Ruangan tersedia ditemukan: ${availableRooms.length}`);
    res.status(200).json(availableRooms);
  } catch (error) {
    console.error(`[${timestamp} WITA] Error fetching available rooms:`, error);
    res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
  }
}

  static async updateStatus(req, res) {
  const { id } = req.params;
  const { status, tanggal, jamMulaiBaru, jamSelesaiBaru } = req.body;
  const timestamp = getTimestamp();

  console.log(`[Debug] Data diterima: id=${id}, status=${status}, tanggal=${tanggal}, jamMulaiBaru=${jamMulaiBaru}, jamSelesaiBaru=${jamSelesaiBaru}`);

  // Validasi status dan tanggal wajib diisi
  if (!status || !tanggal) {
    console.log(`[${timestamp} WITA] Validasi gagal: Status dan tanggal wajib diisi`);
    return res.status(400).json({ message: "Status dan tanggal wajib diisi" });
  }

  // Validasi status
  if (!["Masuk", "Tunda", "Libur"].includes(status)) {
    console.log(`[${timestamp} WITA] Validasi gagal: Status harus 'Masuk', 'Tunda', atau 'Libur'`);
    return res.status(400).json({ message: "Status harus 'Masuk', 'Tunda', atau 'Libur'" });
  }

  // Validasi jam mulai dan jam selesai untuk status Tunda
  if (status === "Tunda" && (!jamMulaiBaru || !jamSelesaiBaru)) {
    console.log(`[${timestamp} WITA] Validasi gagal: Jam mulai dan jam selesai wajib diisi untuk status Tunda`);
    return res.status(400).json({ message: "Jam mulai dan jam selesai wajib diisi untuk status Tunda" });
  }

  try {
    const [jadwal] = await db.query("SELECT * FROM kelas_jadwal WHERE id_kelas_jadwal = ?", [id]);
    if (!jadwal.length) {
      console.log(`[${timestamp} WITA] Jadwal dengan ID ${id} tidak ditemukan`);
      return res.status(404).json({ message: "Jadwal tidak ditemukan" });
    }

    // Validasi jam selesai harus setelah jam mulai untuk status Tunda
    if (status === "Tunda") {
      const waktuMulai = new Date(`${tanggal}T${jamMulaiBaru}`);
      const waktuSelesai = new Date(`${tanggal}T${jamSelesaiBaru}`);
      if (waktuSelesai <= waktuMulai) {
        console.log(`[${timestamp} WITA] Validasi gagal: Jam selesai harus setelah jam mulai`);
        return res.status(400).json({ message: "Jam selesai harus setelah jam mulai" });
      }
    }

    // Simpan atau perbarui status dan waktu baru
    await db.query(
  "INSERT INTO jadwal_status_changes (id_kelas_jadwal, tanggal, status, jam_mulai_baru, jam_selesai_baru) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), jam_mulai_baru = VALUES(jam_mulai_baru), jam_selesai_baru = VALUES(jam_selesai_baru)",
  [id, tanggal, status, status === "Tunda" ? jamMulaiBaru : null, status === "Tunda" ? jamSelesaiBaru : null]
);

    console.log(`[${timestamp} WITA] Status jadwal dengan ID ${id} diperbarui menjadi: ${status} dengan jam ${jamMulaiBaru || '-'} - ${jamSelesaiBaru || '-'}`);
    res.status(200).json({ message: `Jadwal berhasil ${status === "Tunda" ? `ditunda ke ${jamMulaiBaru} - ${jamSelesaiBaru}` : status} pada tanggal ${tanggal}` });
  } catch (error) {
    console.error(`[${timestamp} WITA] Error updating jadwal status:`, error);
    res.status(500).json({ message: "Gagal memperbarui status jadwal", error: error.message });
  }
}

  static async deleteStatus(req, res) {
  const { id } = req.params;
  const { tanggal } = req.body;
  const timestamp = getTimestamp();

  if (!tanggal) {
    console.log(`[${timestamp} WITA] Validasi gagal: Tanggal wajib diisi`);
    return res.status(400).json({ message: "Tanggal wajib diisi" });
  }

  try {
    const [result] = await db.query(
      "DELETE FROM jadwal_status_changes WHERE id_kelas_jadwal = ? AND tanggal = ?",
      [id, tanggal]
    );
    if (result.affectedRows === 0) {
      console.log(`[${timestamp} WITA] Tidak ada status yang dihapus untuk ID ${id} pada tanggal ${tanggal}`);
      return res.status(404).json({ message: "Status tidak ditemukan" });
    }
    console.log(`[${timestamp} WITA] Status untuk ID ${id} pada tanggal ${tanggal} berhasil dihapus`);
    res.status(200).json({ message: "Status berhasil dihapus" });
  } catch (error) {
    console.error(`[${timestamp} WITA] Error deleting status:`, error);
    res.status(500).json({ message: "Gagal menghapus status", error: error.message });
  }
}

  static async approveBooking(req, res) {
    const { id } = req.params;
    const user = req.user;
    console.log(`Admin menyetujui booking dengan ID: ${id}`);

    try {
      if (user.peran !== "admin") {
        return res.status(403).json({ message: "Hanya admin yang dapat menyetujui booking" });
      }

      const [booking] = await db.query("SELECT * FROM pemesanan WHERE id_pemesanan = ?", [id]);
      if (!booking.length) {
        return res.status(404).json({ message: "Booking tidak ditemukan" });
      }

      if (booking[0].status !== "diproses") {
        return res.status(400).json({ message: "Booking ini tidak menunggu persetujuan" });
      }

      await db.query(
        `
        UPDATE pemesanan 
        SET status = 'disetujui', keterangan = 'Disetujui oleh admin'
        WHERE id_pemesanan = ?
      `,
        [id]
      );

      res.status(200).json({ message: "Booking berhasil disetujui" });
    } catch (error) {
      console.error("Error approving booking:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }

  static async rejectBooking(req, res) {
    const { id } = req.params;
    const user = req.user;
    console.log(`Admin menolak booking dengan ID: ${id}`);

    try {
      if (user.peran !== "admin") {
        return res.status(403).json({ message: "Hanya admin yang dapat menolak booking" });
      }

      const [booking] = await db.query("SELECT * FROM pemesanan WHERE id_pemesanan = ?", [id]);
      if (!booking.length) {
        return res.status(404).json({ message: "Booking tidak ditemukan" });
      }

      if (booking[0].status !== "diproses") {
        return res.status(400).json({ message: "Booking ini tidak menunggu persetujuan" });
      }

      await db.query(
        `
        UPDATE pemesanan 
        SET status = 'ditolak', keterangan = 'Ditolak oleh admin'
        WHERE id_pemesanan = ?
      `,
        [id]
      );

      res.status(200).json({ message: "Booking berhasil ditolak" });
    } catch (error) {
      console.error("Error rejecting booking:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
    }
  }
}

module.exports = JadwalController;