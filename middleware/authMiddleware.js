// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = {
  verifyToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    console.log(`[${timestamp} WITA] authMiddleware - Token received for ${req.method} ${req.url}:`, token);

    if (!token) {
      console.log(`[${timestamp} WITA] authMiddleware - Token tidak ditemukan`);
      return res.status(401).json({ message: 'Token tidak ditemukan. Silakan login.' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(`[${timestamp} WITA] authMiddleware - Decoded user:`, decoded);

      // Pastikan decoded memiliki properti yang diperlukan
      if (!decoded || typeof decoded !== 'object') {
        throw new Error('Token tidak berisi data pengguna yang valid');
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTime) {
        console.log(`[${timestamp} WITA] authMiddleware - Token telah kadaluarsa: exp=${decoded.exp}, current=${currentTime}`);
        return res.status(401).json({ message: 'Token telah kadaluarsa. Silakan login ulang.' });
      }

      // Simpan data decoded ke req.user dengan nilai default jika properti tidak ada
      req.user = {
  id_pengguna: decoded.id_pengguna || null,
  peran: decoded.peran || null,
  id_kelas: decoded.id_kelas || null, // Pastikan ini ada
};
      req.userId = req.user.id_pengguna;
      next();
    } catch (error) {
      console.error(`[${timestamp} WITA] authMiddleware - Error verifying token:`, error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token telah kadaluarsa. Silakan login ulang.' });
      }
      return res.status(403).json({ message: 'Token tidak valid. Silakan login lagi.' });
    }
  },

  restrictTo: (...roles) => {
    return (req, res, next) => {
      const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
      console.log(`[${timestamp} WITA] restrictTo - Required roles:`, roles);

      // Pastikan req.user ada
      if (!req.user) {
        console.log(`[${timestamp} WITA] restrictTo - Pengguna tidak terautentikasi`);
        return res.status(401).json({ message: 'Pengguna tidak terautentikasi.' });
      }
      
      // Pastikan peran ada, jika tidak, anggap sebagai 'tamu' atau tolak
      const userRole = req.user.peran;
      console.log(`[${timestamp} WITA] restrictTo - User role:`, userRole);

      if (!userRole || !roles.includes(userRole)) {
        console.log(`[${timestamp} WITA] restrictTo - Akses ditolak. Peran pengguna: ${userRole}, Peran yang diperlukan: ${roles}`);
        return res.status(403).json({ message: 'Akses ditolak. Anda tidak memiliki izin untuk mengakses rute ini.' });
      }
      next();
    };
  },
};

module.exports = authMiddleware;