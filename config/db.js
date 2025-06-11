// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "roomease",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // Timeout 10 detik untuk koneksi
  timezone: '+08:00', // Gunakan offset untuk WITA (UTC+8) sebagai ganti Asia/Makassar
});

// Fungsi untuk tes koneksi
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.query('SELECT NOW() AS server_time, 1 + 1 AS result'); // Ubah alias menjadi server_time
    const witaTime = new Date(results[0].server_time).toISOString().replace('Z', '+08:00'); // Konversi ke WITA
    console.log(`[${witaTime} WITA] Connected to MySQL database`);
    console.log(`[${witaTime} WITA] Test query result:`, results[0].result);
    connection.release();
  } catch (err) {
    const now = new Date();
    const witaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Makassar' })).toISOString().replace('Z', '+08:00');
    console.error(`[${witaTime} WITA] Error connecting to MySQL database:`, err);
    throw err;
  }
}

// Jalankan tes koneksi saat file dimuat
testConnection().catch((err) => {
  const now = new Date();
  const witaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Makassar' })).toISOString().replace('Z', '+08:00');
  console.error(`[${witaTime} WITA] Failed to initialize database connection. Server will not start.`, err);
  process.exit(1);
});

// Ekspor pool sebagai modul
module.exports = pool;