// routes/prodiRoutes.js
const express = require('express');
const router = express.Router();
const ProdiController = require('../controllers/prodiController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to get all Prodi (dilindungi middleware)
router.get('/', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  ProdiController.getAllProdi
);

// Route to get Kelas by Prodi (dilindungi middleware)
router.get('/kelas', 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  ProdiController.getKelasByProdi
);

module.exports = router;