// app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const kelasRoutes = require('./routes/kelasRoutes');
const ruanganRoutes = require('./routes/ruanganRoutes');
const dosenRoutes = require('./routes/dosenRoutes');
const matkulRoutes = require('./routes/matkulRoutes');
const prodiRoutes = require('./routes/prodiRoutes');
const otpRoutes = require('./routes/otpRoutes');
const userRoutes = require('./routes/userRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const jadwalRoutes = require('./routes/jadwalRoutes');
const pemesananRoutes = require('./routes/pemesananRoutes');

app.use(cors({
  origin: ['http://127.0.0.1:8080', 'http://localhost:8080', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// Logging middleware for requests
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  console.log(`[${timestamp} WITA] Request received: ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[${timestamp} WITA] Request body:`, req.body);
  }
  if (req.query && Object.keys(req.query).length > 0) {
    console.log(`[${timestamp} WITA] Request query:`, req.query);
  }
  next();
});

// Public statistics endpoint
app.get('/api/statistics/public', async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    const [totalRooms] = await db.query('SELECT COUNT(*) as count FROM ruangan');
    const totalRoomsCount = parseInt(totalRooms[0].count);

    const tanggal = req.query.tanggal || new Date().toLocaleString('en-US', { timeZone: 'Asia/Makassar' }).split(' ')[0].replace(/\//g, '-');
    const hari = new Date(tanggal).toLocaleString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' });
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Makassar' }).slice(0, 5);

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tanggal)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Format tanggal tidak valid. Gunakan YYYY-MM-DD.`);
      return res.status(400).json({ message: "Format tanggal tidak valid. Gunakan YYYY-MM-DD." });
    }

    const [bookedRoomsFromJadwal] = await db.query(
      `
      SELECT COUNT(DISTINCT kj.id_ruangan) as count
      FROM kelas_jadwal kj
      LEFT JOIN jadwal_status_changes jsc ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal AND jsc.tanggal = ?
      WHERE kj.hari = ?
      AND (COALESCE(jsc.status, kj.status) IN ('Masuk', 'Tunda'))
      AND (
        ? BETWEEN 
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_mulai_baru IS NOT NULL AND jsc.jam_selesai_baru IS NOT NULL 
          THEN jsc.jam_mulai_baru 
          ELSE kj.jam_mulai 
        END
        AND 
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_mulai_baru IS NOT NULL AND jsc.jam_selesai_baru IS NOT NULL 
          THEN jsc.jam_selesai_baru 
          ELSE kj.jam_selesai 
        END
      )
      `,
      [tanggal, hari, currentTime]
    );

    const [bookedRoomsFromPemesanan] = await db.query(
      `
      SELECT COUNT(DISTINCT p.id_ruangan) as count
      FROM pemesanan p
      WHERE p.tanggal = ?
      AND p.status = 'disetujui'
      AND p.jam_mulai <= ?
      AND p.jam_selesai > ?
      `,
      [tanggal, currentTime, currentTime]
    );

    const bookedRoomsCount = parseInt(bookedRoomsFromJadwal[0].count) + parseInt(bookedRoomsFromPemesanan[0].count);
    const availableRoomsCount = totalRoomsCount - bookedRoomsCount;

    console.log(`[${timestamp} WITA] Mengirim data statistik publik:`, {
      totalRooms: totalRoomsCount,
      availableRooms: availableRoomsCount,
      bookedRooms: bookedRoomsCount,
    });

    res.json({
      totalRooms: totalRoomsCount,
      availableRooms: availableRoomsCount,
      bookedRooms: bookedRoomsCount,
    });
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Error fetching statistics:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

// Admin statistics endpoint
app.get('/api/statistics/admin', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo('admin', 'ketua', 'sekretaris'), 
  async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    const [totalRooms] = await db.query('SELECT COUNT(*) as count FROM ruangan');
    const totalRoomsCount = parseInt(totalRooms[0].count);

    const tanggal = req.query.tanggal || new Date().toLocaleString('en-US', { timeZone: 'Asia/Makassar' }).split(' ')[0].replace(/\//g, '-');
    const hari = new Date(tanggal).toLocaleString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' });
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Makassar' }).slice(0, 5);

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tanggal)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Format tanggal tidak valid. Gunakan YYYY-MM-DD.`);
      return res.status(400).json({ message: "Format tanggal tidak valid. Gunakan YYYY-MM-DD." });
    }

    const [bookedRoomsFromJadwal] = await db.query(
      `
      SELECT COUNT(DISTINCT kj.id_ruangan) as count
      FROM kelas_jadwal kj
      LEFT JOIN jadwal_status_changes jsc ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal AND jsc.tanggal = ?
      WHERE kj.hari = ?
      AND (COALESCE(jsc.status, kj.status) IN ('Masuk', 'Tunda'))
      AND (
        ? BETWEEN 
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_mulai_baru IS NOT NULL AND jsc.jam_selesai_baru IS NOT NULL 
          THEN jsc.jam_mulai_baru 
          ELSE kj.jam_mulai 
        END
        AND 
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_mulai_baru IS NOT NULL AND jsc.jam_selesai_baru IS NOT NULL 
          THEN jsc.jam_selesai_baru 
          ELSE kj.jam_selesai 
        END
      )
      `,
      [tanggal, hari, currentTime]
    );

    const [bookedRoomsFromPemesanan] = await db.query(
      `
      SELECT COUNT(DISTINCT p.id_ruangan) as count
      FROM pemesanan p
      WHERE p.tanggal = ?
      AND p.status = 'disetujui'
      AND p.jam_mulai <= ?
      AND p.jam_selesai > ?
      `,
      [tanggal, currentTime, currentTime]
    );

    const bookedRoomsCount = parseInt(bookedRoomsFromJadwal[0].count) + parseInt(bookedRoomsFromPemesanan[0].count);
    const availableRoomsCount = totalRoomsCount - bookedRoomsCount;

    console.log(`[${timestamp} WITA] Mengirim data statistik untuk admin:`, {
      totalRooms: totalRoomsCount,
      availableRooms: availableRoomsCount,
      bookedRooms: bookedRoomsCount,
    });

    res.json({
      totalRooms: totalRoomsCount,
      availableRooms: availableRoomsCount,
      bookedRooms: bookedRoomsCount,
    });
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Error fetching statistics for admin:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

// Public jadwal endpoint
app.get('/api/jadwal/public', async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    const { hari, tanggal } = req.query;
    const currentDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Makassar' }).split(' ')[0].replace(/\//g, '-');
    const useDate = tanggal || currentDate;
    const useHari = hari || new Date(useDate).toLocaleString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' });
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Makassar' }).slice(0, 5);

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(useDate)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Format tanggal tidak valid. Gunakan YYYY-MM-DD.`);
      return res.status(400).json({ message: "Format tanggal tidak valid. Gunakan YYYY-MM-DD." });
    }

    const [jadwals] = await db.query(
      `
      SELECT 
        kj.id_kelas_jadwal AS id,
        kj.id_kelas,
        kj.id_matkul,
        kj.id_dosen,
        kj.id_ruangan,
        kj.hari,
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_mulai_baru IS NOT NULL THEN jsc.jam_mulai_baru
          ELSE kj.jam_mulai
        END AS jam_mulai,
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_selesai_baru IS NOT NULL THEN jsc.jam_selesai_baru
          ELSE kj.jam_selesai
        END AS jam_selesai,
        COALESCE(jsc.status, kj.status) AS status,
        jsc.jam_mulai_baru,
        jsc.jam_selesai_baru,
        k.nama_kelas,
        m.nama_matkul,
        d.nama_dosen,
        d.kode_dosen,
        r.nama_ruangan
      FROM kelas_jadwal kj
      LEFT JOIN jadwal_status_changes jsc ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal AND jsc.tanggal = ?
      LEFT JOIN kelas k ON kj.id_kelas = k.id_kelas
      LEFT JOIN mata_kuliah m ON kj.id_matkul = m.id_matkul
      LEFT JOIN dosen d ON kj.id_dosen = d.id_dosen
      LEFT JOIN ruangan r ON kj.id_ruangan = r.id_ruangan
      WHERE kj.hari = ? AND (kj.status = 'Masuk' OR kj.status = 'Tunda')
      `,
      [useDate, useHari]
    );

    const [pemesanans] = await db.query(
      `
      SELECT 
        p.id_pemesanan AS id,
        p.id_kelas,
        p.id_matkul,
        p.id_dosen,
        p.id_ruangan,
        DATE(p.tanggal) AS tanggal_raw, -- Ambil hanya tanggal
        p.jam_mulai,
        p.jam_selesai,
        p.status,
        k.nama_kelas,
        m.nama_matkul,
        d.nama_dosen,
        d.kode_dosen,
        r.nama_ruangan
      FROM pemesanan p
      LEFT JOIN kelas k ON p.id_kelas = k.id_kelas
      LEFT JOIN ruangan r ON p.id_ruangan = r.id_ruangan
      LEFT JOIN mata_kuliah m ON p.id_matkul = m.id_matkul
      LEFT JOIN dosen d ON p.id_dosen = d.id_dosen
      WHERE p.tanggal = ? AND p.status = 'disetujui'
        AND p.jam_mulai <= ? AND p.jam_selesai > ?
      `,
      [useDate, currentTime, currentTime]
    );

    const combinedJadwals = [
      ...jadwals
        .filter(j => {
          const jamMulai = j.status === 'Tunda' && j.jam_mulai_baru ? j.jam_mulai_baru : j.jam_mulai;
          const jamSelesai = j.status === 'Tunda' && j.jam_selesai_baru ? j.jam_selesai_baru : j.jam_selesai;
          return (j.status === 'Masuk' || j.status === 'Tunda') && jamSelesai > currentTime;
        })
        .map(j => ({
          id_kelas_jadwal: j.id,
          id_kelas: j.id_kelas,
          id_matkul: j.id_matkul,
          id_dosen: j.id_dosen,
          id_ruangan: j.id_ruangan,
          hari: j.hari,
          jam_mulai: j.status === 'Tunda' && j.jam_mulai_baru 
            ? j.jam_mulai_baru.toString().slice(0, 5) 
            : j.jam_mulai.toString().slice(0, 5),
          jam_selesai: j.status === 'Tunda' && j.jam_selesai_baru 
            ? j.jam_selesai_baru.toString().slice(0, 5) 
            : j.jam_selesai.toString().slice(0, 5),
          status: j.status,
          nama_kelas: j.nama_kelas,
          nama_matkul: j.nama_matkul,
          nama_dosen: j.nama_dosen,
          kode_dosen: j.kode_dosen,
          nama_ruangan: j.nama_ruangan,
        })),
      ...pemesanans
        .filter(p => p.jam_selesai > currentTime)
        .map(p => {
          const hari = new Date(p.tanggal_raw).toLocaleString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' });
          return {
            id_kelas_jadwal: p.id,
            id_kelas: p.id_kelas,
            id_matkul: p.id_matkul,
            id_dosen: p.id_dosen,
            id_ruangan: p.id_ruangan,
            hari: hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase(),
            jam_mulai: p.jam_mulai.toString().slice(0, 5),
            jam_selesai: p.jam_selesai.toString().slice(0, 5),
            status: p.status === 'disetujui' ? 'Terisi (Pemesanan)' : p.status,
            nama_kelas: p.nama_kelas,
            nama_matkul: p.nama_matkul,
            nama_dosen: p.nama_dosen,
            kode_dosen: p.kode_dosen,
            nama_ruangan: p.nama_ruangan,
          };
        }),
    ];

    console.log(`[${timestamp} WITA] Jadwal publik ditemukan:`, combinedJadwals.length);
    res.status(200).json(combinedJadwals);
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Error fetching public jadwal:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

// Public room status endpoint
app.get('/api/ruangan/public/status', async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.log(`[${timestamp} WITA] Mengakses endpoint /api/ruangan/public/status`);
    await RuanganController.getPublicRoomStatus(req, res);
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Error in /api/ruangan/public/status:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

// Public data endpoints
app.get('/api/ruangan/public', async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    const [ruangan] = await db.query("SELECT * FROM ruangan");
    console.log(`[${timestamp} WITA] Mengirim daftar ruangan publik:`, ruangan.length);
    res.status(200).json(ruangan);
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Error fetching public ruangan:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

app.get('/api/kelas/public', async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    const [kelas] = await db.query("SELECT * FROM kelas");
    console.log(`[${timestamp} WITA] Mengirim daftar kelas publik:`, kelas.length);
    res.status(200).json(kelas);
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Error fetching public kelas:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

app.get('/api/dosen/public', async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    const [dosen] = await db.query("SELECT * FROM dosen");
    console.log(`[${timestamp} WITA] Mengirim daftar dosen publik:`, dosen.length);
    res.status(200).json(dosen);
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Error fetching public dosen:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

app.get('/api/matkul/public', async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    const [matkul] = await db.query("SELECT * FROM mata_kuliah");
    console.log(`[${timestamp} WITA] Mengirim daftar mata kuliah publik:`, matkul.length);
    res.status(200).json(matkul);
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Error fetching public mata kuliah:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

// Authenticated jadwal endpoint
app.get('/api/jadwal', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo('admin', 'ketua', 'sekretaris'), 
  async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    const { hari, id_kelas, tanggal } = req.query;
    const useDate = tanggal || new Date().toLocaleString('en-US', { timeZone: 'Asia/Makassar' }).split(' ')[0].replace(/\//g, '-');
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Makassar' }).slice(0, 5);

    let jadwalQuery = `
      SELECT 
        kj.id_kelas_jadwal AS id,
        kj.id_kelas,
        kj.id_matkul,
        kj.id_dosen,
        kj.id_ruangan,
        kj.hari,
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_mulai_baru IS NOT NULL THEN jsc.jam_mulai_baru
          ELSE kj.jam_mulai
        END AS jam_mulai,
        CASE 
          WHEN jsc.status = 'Tunda' AND jsc.jam_selesai_baru IS NOT NULL THEN jsc.jam_selesai_baru
          ELSE kj.jam_selesai
        END AS jam_selesai,
        COALESCE(jsc.status, kj.status) AS status,
        jsc.jam_mulai_baru,
        jsc.jam_selesai_baru,
        k.nama_kelas,
        m.nama_matkul,
        d.nama_dosen,
        d.kode_dosen,
        r.nama_ruangan
      FROM kelas_jadwal kj
      LEFT JOIN jadwal_status_changes jsc ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal AND jsc.tanggal = ?
      LEFT JOIN kelas k ON kj.id_kelas = k.id_kelas
      LEFT JOIN ruangan r ON kj.id_ruangan = r.id_ruangan
      LEFT JOIN mata_kuliah m ON kj.id_matkul = m.id_matkul
      LEFT JOIN dosen d ON kj.id_dosen = d.id_dosen
    `;
    let jadwalParams = [useDate];
    let jadwalConditions = [];

    let pemesananQuery = `
      SELECT 
        p.id_pemesanan AS id,
        p.id_kelas,
        p.id_matkul,
        p.id_dosen,
        p.id_ruangan,
        DATE(p.tanggal) AS tanggal_raw, -- Ambil hanya tanggal
        p.jam_mulai,
        p.jam_selesai,
        p.status,
        k.nama_kelas,
        m.nama_matkul,
        d.nama_dosen,
        d.kode_dosen,
        r.nama_ruangan
      FROM pemesanan p
      LEFT JOIN kelas k ON p.id_kelas = k.id_kelas
      LEFT JOIN ruangan r ON p.id_ruangan = r.id_ruangan
      LEFT JOIN mata_kuliah m ON p.id_matkul = m.id_matkul
      LEFT JOIN dosen d ON p.id_dosen = d.id_dosen
      WHERE p.tanggal = ? AND p.status = 'disetujui'
        AND p.jam_mulai <= ? AND p.jam_selesai > ?
    `;
    let pemesananParams = [useDate, currentTime, currentTime];
    let pemesananConditions = [];

    if (hari) {
      jadwalConditions.push('kj.hari = ?');
      jadwalParams.push(hari);
      pemesananConditions.push('DATE(p.tanggal) = ?');
      pemesananParams.push(useDate);
    }

    if (req.user.peran !== 'admin') {
      if (!req.user.id_kelas) {
        console.log(`[${timestamp} WITA] Tidak ada id_kelas untuk ${req.user.peran} (id_pengguna: ${req.user.id_pengguna})`);
        return res.status(403).json({ message: 'Akun Anda tidak terkait dengan kelas. Hubungi administrator.' });
      }
      jadwalConditions.push('kj.id_kelas = ?');
      jadwalParams.push(req.user.id_kelas);
      pemesananConditions.push('p.id_kelas = ?');
      pemesananParams.push(req.user.id_kelas);
      console.log(`[${timestamp} WITA] Filtering jadwal untuk ${req.user.peran} dengan id_kelas: ${req.user.id_kelas}`);
    } else if (id_kelas && req.user.peran === 'admin') {
      jadwalConditions.push('kj.id_kelas = ?');
      jadwalParams.push(id_kelas);
      pemesananConditions.push('p.id_kelas = ?');
      pemesananParams.push(id_kelas);
      console.log(`[${timestamp} WITA] Admin filtering jadwal dengan id_kelas: ${id_kelas}`);
    }

    if (jadwalConditions.length > 0) {
      jadwalQuery += ' WHERE ' + jadwalConditions.join(' AND ');
    }

    if (pemesananConditions.length > 0) {
      pemesananQuery += ' AND ' + pemesananConditions.join(' AND ');
    }

    const [jadwals] = await db.query(jadwalQuery, jadwalParams);
    const [pemesanans] = await db.query(pemesananQuery, pemesananParams);

    const combinedJadwals = [
      ...jadwals.map(j => ({
        id_kelas_jadwal: j.id,
        id_kelas: j.id_kelas,
        id_matkul: j.id_matkul,
        id_dosen: j.id_dosen,
        id_ruangan: j.id_ruangan,
        hari: j.hari,
        jam_mulai: j.status === 'Tunda' && j.jam_mulai_baru 
          ? j.jam_mulai_baru.toString().slice(0, 5) 
          : j.jam_mulai.toString().slice(0, 5),
        jam_selesai: j.status === 'Tunda' && j.jam_selesai_baru 
          ? j.jam_selesai_baru.toString().slice(0, 5) 
          : j.jam_selesai.toString().slice(0, 5),
        status: j.status,
        jam_mulai_baru: j.jam_mulai_baru ? j.jam_mulai_baru.toString().slice(0, 5) : null,
        jam_selesai_baru: j.jam_selesai_baru ? j.jam_selesai_baru.toString().slice(0, 5) : null,
        nama_kelas: j.nama_kelas,
        nama_matkul: j.nama_matkul,
        nama_dosen: j.nama_dosen,
        kode_dosen: j.kode_dosen,
        nama_ruangan: j.nama_ruangan,
      })),
      ...pemesanans.map(p => {
        const hari = new Date(p.tanggal_raw).toLocaleString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' });
        return {
          id_kelas_jadwal: p.id,
          id_kelas: p.id_kelas,
          id_matkul: p.id_matkul,
          id_dosen: p.id_dosen,
          id_ruangan: p.id_ruangan,
          hari: hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase(),
          jam_mulai: p.jam_mulai.toString().slice(0, 5),
          jam_selesai: p.jam_selesai.toString().slice(0, 5),
          status: p.status === 'disetujui' ? 'Terisi (Pemesanan)' : p.status,
          jam_mulai_baru: null,
          jam_selesai_baru: null,
          nama_kelas: p.nama_kelas,
          nama_matkul: p.nama_matkul,
          nama_dosen: p.nama_dosen,
          kode_dosen: p.kode_dosen,
          nama_ruangan: p.nama_ruangan,
        };
      }),
    ];

    console.log(`[${timestamp} WITA] Jadwal ditemukan untuk user ${req.user.peran} (id_kelas: ${req.user.id_kelas}):`, combinedJadwals.length);
    res.status(200).json(combinedJadwals);
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Error fetching jadwal:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

// Available rooms endpoint
app.get('/api/jadwal/available-rooms', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo('admin', 'ketua', 'sekretaris'), 
  require('./controllers/jadwalController').getAvailableRooms
);

// Create jadwal endpoint
app.post('/api/jadwal', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo('admin'), 
  async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    const { id_kelas, id_matkul, id_dosen, id_ruangan, hari, jam_mulai, jam_selesai, status } = req.body;
    if (!id_kelas || !id_matkul || !id_dosen || !id_ruangan || !hari || !jam_mulai || !jam_selesai || !status) {
      console.log(`[${timestamp} WITA] Validasi gagal: Semua field harus diisi.`);
      return res.status(400).json({ message: 'Semua field harus diisi.' });
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(jam_mulai) || !timeRegex.test(jam_selesai)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Format jam tidak valid. Gunakan HH:mm.`);
      return res.status(400).json({ message: 'Format jam tidak valid. Gunakan HH:mm.' });
    }

    if (jam_mulai >= jam_selesai) {
      console.log(`[${timestamp} WITA] Validasi gagal: Jam mulai harus lebih awal dari jam selesai.`);
      return res.status(400).json({ message: 'Jam mulai harus lebih awal dari jam selesai.' });
    }

    if (!['Masuk', 'Libur', 'Tunda'].includes(status)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Status harus Masuk, Libur, atau Tunda.`);
      return res.status(400).json({ message: 'Status harus Masuk, Libur, atau Tunda.' });
    }

    const jamMulaiWithSeconds = `${jam_mulai}:00`;
    const jamSelesaiWithSeconds = `${jam_selesai}:00`;

    const [result] = await db.query(
      'INSERT INTO kelas_jadwal (id_kelas, id_matkul, id_dosen, id_ruangan, hari, jam_mulai, jam_selesai, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id_kelas, id_matkul, id_dosen, id_ruangan, hari, jamMulaiWithSeconds, jamSelesaiWithSeconds, status]
    );

    console.log(`[${timestamp} WITA] Jadwal ditambahkan:`, { id: result.insertId });
    res.status(201).json({ message: 'Jadwal berhasil ditambahkan', id: result.insertId });
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Error adding jadwal:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

app.get('/api/jadwal/:id', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo('admin', 'ketua', 'sekretaris'), 
  async (req, res) => {
  const { id } = req.params;
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  const useDate = new Date().toISOString().split('T')[0];

  try {
    const [jadwal] = await db.query(
      `
      SELECT 
        kj.id_kelas_jadwal AS id,
        kj.id_kelas,
        kj.id_matkul,
        kj.id_dosen,
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
        COALESCE(jsc.status, kj.status) AS status,
        jsc.jam_mulai_baru,
        jsc.jam_selesai_baru
      FROM kelas_jadwal kj
      LEFT JOIN jadwal_status_changes jsc ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal AND jsc.tanggal = ?
      LEFT JOIN kelas k ON kj.id_kelas = k.id_kelas
      LEFT JOIN ruangan r ON kj.id_ruangan = r.id_ruangan
      LEFT JOIN mata_kuliah m ON kj.id_matkul = m.id_matkul
      LEFT JOIN dosen d ON kj.id_dosen = d.id_dosen
      WHERE kj.id_kelas_jadwal = ?
      `,
      [useDate, id]
    );

    const [pemesanan] = await db.query(
      `
      SELECT 
        p.id_pemesanan AS id,
        p.id_kelas,
        p.id_matkul,
        p.id_dosen,
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
      WHERE p.id_pemesanan = ? AND p.status = 'disetujui'
      `,
      [id]
    );

    let result = null;
    if (jadwal.length > 0) {
      result = {
        ...jadwal[0],
        jam_mulai: jadwal[0].jam_mulai.toString().slice(0, 5),
        jam_selesai: jadwal[0].jam_selesai.toString().slice(0, 5),
        jam_mulai_baru: jadwal[0].jam_mulai_baru ? jadwal[0].jam_mulai_baru.toString().slice(0, 5) : null,
        jam_selesai_baru: jadwal[0].jam_selesai_baru ? jadwal[0].jam_selesai_baru.toString().slice(0, 5) : null,
      };
    } else if (pemesanan.length > 0) {
      const hari = new Date(pemesanan[0].tanggal_raw).toLocaleString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' });
      result = {
        id: pemesanan[0].id,
        id_kelas: pemesanan[0].id_kelas,
        id_matkul: pemesanan[0].id_matkul,
        id_dosen: pemesanan[0].id_dosen,
        id_ruangan: pemesanan[0].id_ruangan,
        nama_kelas: pemesanan[0].nama_kelas,
        nama_ruangan: pemesanan[0].nama_ruangan,
        nama_matkul: pemesanan[0].nama_matkul,
        nama_dosen: pemesanan[0].nama_dosen,
        hari: hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase(),
        jam_mulai: pemesanan[0].jam_mulai.toString().slice(0, 5),
        jam_selesai: pemesanan[0].jam_selesai.toString().slice(0, 5),
        status: pemesanan[0].status === 'disetujui' ? 'Terisi (Pemesanan)' : pemesanan[0].status,
        jam_mulai_baru: null,
        jam_selesai_baru: null,
      };
    }

    if (!result) {
      console.log(`[${timestamp} WITA] Jadwal dengan ID ${id} tidak ditemukan`);
      return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
    }

    console.log(`[${timestamp} WITA] Detail jadwal ditemukan untuk id ${id}:`, result);
    res.status(200).json(result);
  } catch (error) {
    console.error(`[${timestamp} WITA] Gagal mengambil jadwal:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

app.get('/api/pemesanan/check-conflict', authMiddleware.verifyToken, async (req, res) => {
  const { id_ruangan, tanggal, jam_mulai, jam_selesai } = req.query;
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

  try {
    // Periksa pemesanan yang bertabrakan
    const [pemesananKonflik] = await db.query(
      `
      SELECT * FROM pemesanan
      WHERE id_ruangan = ?
        AND tanggal = ?
        AND status = 'disetujui'
        AND (
          (jam_mulai <= ? AND jam_selesai > ?) OR 
          (jam_mulai < ? AND jam_selesai >= ?) OR 
          (jam_mulai >= ? AND jam_selesai <= ?)
        )
      `,
      [id_ruangan, tanggal, jam_mulai, jam_mulai, jam_selesai, jam_selesai, jam_mulai, jam_selesai]
    );

    // Periksa jadwal lain yang bertabrakan
    const [jadwalKonflik] = await db.query(
      `
      SELECT * FROM kelas_jadwal kj
      LEFT JOIN jadwal_status_changes jsc 
        ON kj.id_kelas_jadwal = jsc.id_kelas_jadwal 
        AND jsc.tanggal = ?
      WHERE kj.id_ruangan = ? 
        AND kj.hari = ? 
        AND (
          (kj.jam_mulai <= ? AND kj.jam_selesai > ?) OR 
          (kj.jam_mulai < ? AND kj.jam_selesai >= ?) OR 
          (kj.jam_mulai >= ? AND kj.jam_selesai <= ?)
        )
        AND (COALESCE(jsc.status, kj.status) = 'Masuk')
      `,
      [tanggal, id_ruangan, new Date(tanggal).toLocaleString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' }), jam_mulai, jam_mulai, jam_selesai, jam_selesai, jam_mulai, jam_selesai]
    );

    const hasConflict = pemesananKonflik.length > 0 || jadwalKonflik.length > 0;
    console.log(`[${timestamp} WITA] Pengecekan konflik: ${hasConflict ? 'Konflik ditemukan' : 'Tidak ada konflik'}`);
    res.status(200).json({ conflict: hasConflict });
  } catch (error) {
    console.error(`[${timestamp} WITA] Gagal memeriksa konflik:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});


// Update jadwal status endpoint
app.put('/api/jadwal/:id/status', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo('admin', 'ketua', 'sekretaris'), 
  async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    const { id } = req.params;
    const { status, tanggal, jamMulaiBaru, jamSelesaiBaru } = req.body;

    // Validasi status dan tanggal
    if (!status || !tanggal) {
      console.log(`[${timestamp} WITA] Validasi gagal: Status dan tanggal harus diisi.`);
      return res.status(400).json({ message: 'Status dan tanggal harus diisi.' });
    }

    if (!['Libur', 'Tunda', 'Masuk'].includes(status)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Status harus Libur, Tunda, atau Masuk.`);
      return res.status(400).json({ message: 'Status harus Libur, Tunda, atau Masuk.' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tanggal)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Format tanggal tidak valid. Gunakan YYYY-MM-DD.`);
      return res.status(400).json({ message: 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.' });
    }

    // Validasi jamMulaiBaru dan jamSelesaiBaru jika status adalah Tunda
    if (status === 'Tunda') {
      if (!jamMulaiBaru || !jamSelesaiBaru) {
        console.log(`[${timestamp} WITA] Validasi gagal: Jam mulai dan jam selesai harus diisi untuk status Tunda.`);
        return res.status(400).json({ message: 'Jam mulai dan jam selesai harus diisi untuk status Tunda.' });
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(jamMulaiBaru) || !timeRegex.test(jamSelesaiBaru)) {
        console.log(`[${timestamp} WITA] Validasi gagal: Format jam tidak valid. Gunakan HH:mm.`);
        return res.status(400).json({ message: 'Format jam tidak valid. Gunakan HH:mm.' });
      }

      if (jamMulaiBaru >= jamSelesaiBaru) {
        console.log(`[${timestamp} WITA] Validasi gagal: Jam mulai harus lebih awal dari jam selesai.`);
        return res.status(400).json({ message: 'Jam mulai harus lebih awal dari jam selesai.' });
      }
    }

    const [jadwal] = await db.query('SELECT * FROM kelas_jadwal WHERE id_kelas_jadwal = ?', [id]);
    if (jadwal.length === 0) {
      console.log(`[${timestamp} WITA] Jadwal tidak ditemukan untuk id: ${id}`);
      return res.status(404).json({ message: 'Jadwal tidak ditemukan.' });
    }

    if ((req.user.peran === 'ketua' || req.user.peran === 'sekretaris')) {
      console.log(`[${timestamp} WITA] Validasi ${req.user.peran}: req.user.id_kelas = ${req.user.id_kelas}, jadwal[0].id_kelas = ${jadwal[0].id_kelas}`);
      if (jadwal[0].id_kelas != req.user.id_kelas) {
        return res.status(403).json({ message: 'Anda hanya dapat mengubah jadwal kelas Anda sendiri.' });
      }
    }

    // Hapus perubahan status sebelumnya untuk tanggal ini
    await db.query('DELETE FROM jadwal_status_changes WHERE id_kelas_jadwal = ? AND tanggal = ?', [id, tanggal]);

    // Simpan perubahan status
    if (status !== 'Masuk') {
      await db.query(
        'INSERT INTO jadwal_status_changes (id_kelas_jadwal, tanggal, status, jam_mulai_baru, jam_selesai_baru) VALUES (?, ?, ?, ?, ?)',
        [
          id,
          tanggal,
          status,
          status === 'Tunda' ? `${jamMulaiBaru}:00` : null,
          status === 'Tunda' ? `${jamSelesaiBaru}:00` : null
        ]
      );
    }

    console.log(`[${timestamp} WITA] Status jadwal diubah:`, { id, tanggal, status, jamMulaiBaru, jamSelesaiBaru, user: req.user.peran });
    res.status(200).json({ 
      message: status === 'Tunda' 
        ? `Jadwal berhasil ditunda ke ${jamMulaiBaru} - ${jamSelesaiBaru}` 
        : 'Status jadwal berhasil diubah.'
    });
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Error updating jadwal status:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

// Update jadwal endpoint
app.put('/api/jadwal/:id', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo('admin'), 
  async (req, res) => {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    const { id } = req.params;
    const { id_kelas, id_matkul, id_dosen, id_ruangan, hari, jam_mulai, jam_selesai, status } = req.body;
    if (!id_kelas || !id_matkul || !id_dosen || !id_ruangan || !hari || !jam_mulai || !jam_selesai || !status) {
      console.log(`[${timestamp} WITA] Validasi gagal: Semua field harus diisi.`);
      return res.status(400).json({ message: 'Semua field harus diisi.' });
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(jam_mulai) || !timeRegex.test(jam_selesai)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Format jam tidak valid. Gunakan HH:mm.`);
      return res.status(400).json({ message: 'Format jam tidak valid. Gunakan HH:mm.' });
    }

    if (jam_mulai >= jam_selesai) {
      console.log(`[${timestamp} WITA] Validasi gagal: Jam mulai harus lebih awal dari jam selesai.`);
      return res.status(400).json({ message: 'Jam mulai harus lebih awal dari jam selesai.' });
    }

    if (!['Masuk', 'Libur', 'Tunda'].includes(status)) {
      console.log(`[${timestamp} WITA] Validasi gagal: Status harus Masuk, Libur, atau Tunda.`);
      return res.status(400).json({ message: 'Status harus Masuk, Libur, atau Tunda.' });
    }

    const jamMulaiWithSeconds = `${jam_mulai}:00`;
    const jamSelesaiWithSeconds = `${jam_selesai}:00`;

    const [result] = await db.query(
      'UPDATE kelas_jadwal SET id_kelas = ?, id_matkul = ?, id_dosen = ?, id_ruangan = ?, hari = ?, jam_mulai = ?, jam_selesai = ?, status = ? WHERE id_kelas_jadwal = ?',
      [id_kelas, id_matkul, id_dosen, id_ruangan, hari, jamMulaiWithSeconds, jamSelesaiWithSeconds, status, id]
    );

    if (result.affectedRows === 0) {
      console.log(`[${timestamp} WITA] Jadwal tidak ditemukan untuk id: ${id}`);
      return res.status(404).json({ message: 'Jadwal tidak ditemukan.' });
    }

    console.log(`[${timestamp} WITA] Jadwal diperbarui:`, { id });
    res.status(200).json({ message: 'Jadwal berhasil diperbarui' });
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Error updating jadwal:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/kelas', authMiddleware.verifyToken, authMiddleware.restrictTo('admin'), kelasRoutes);
app.use('/api/ruangan', ruanganRoutes);
app.use('/api/dosen', authMiddleware.verifyToken, authMiddleware.restrictTo('admin', 'ketua', 'sekretaris'), dosenRoutes);
app.use('/api/mata-kuliah', authMiddleware.verifyToken, authMiddleware.restrictTo('admin', 'ketua', 'sekretaris'), matkulRoutes);
app.use('/api/prodi', authMiddleware.verifyToken, authMiddleware.restrictTo('admin', 'ketua', 'sekretaris'), prodiRoutes);
app.use('/api/users', authMiddleware.verifyToken, authMiddleware.restrictTo('admin', 'ketua', 'sekretaris'), userRoutes);
app.use('/api/pemesanan', pemesananRoutes); // Pindahkan ke sini
app.use('/api/jadwal', jadwalRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  console.error(`[${timestamp} WITA] Unhandled error:`, err.stack);
  res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

// 404 handler
app.use((req, res) => {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  console.log(`[${timestamp} WITA] Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Rute tidak ditemukan' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await db.query('SELECT 1');
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.log(`[${timestamp} WITA] Koneksi database berhasil`);
    app.listen(PORT, () => {
      console.log(`[${timestamp} WITA] Server berjalan pada port ${PORT}`);
    });
  } catch (error) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.error(`[${timestamp} WITA] Gagal memulai server:`, error);
    process.exit(1);
  }
}

startServer();