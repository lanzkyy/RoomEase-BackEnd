// routes/jadwalRoutes.js
const express = require("express");
const router = express.Router();
const jadwalController = require("../controllers/jadwalController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/jadwal", authMiddleware.verifyToken, jadwalController.getAll); // Ubah getJadwal menjadi getAll
router.get("/jadwal/public", jadwalController.getAllPublic); // Hapus authMiddleware untuk akses publik
router.get("/jadwal/available-rooms", authMiddleware.verifyToken, jadwalController.getAvailableRooms);
router.put("/jadwal/:id/status", authMiddleware.verifyToken, authMiddleware.restrictTo("ketua", "sekretaris"), jadwalController.updateStatus);

router.get("/ruangan", authMiddleware.verifyToken, jadwalController.getAll); // Ubah getRuangan menjadi getAll (jika ada di controller)
router.get("/ruangan/public", jadwalController.getAllPublic); // Ubah ke getAllPublic untuk konsistensi
router.post("/jadwal", authMiddleware.verifyToken, authMiddleware.restrictTo("admin"), jadwalController.create);
router.put("/jadwal/:id", authMiddleware.verifyToken, authMiddleware.restrictTo("admin", "ketua", "sekretaris"), jadwalController.update);
router.put("/jadwal/confirm/:id", authMiddleware.verifyToken, authMiddleware.restrictTo("admin"), jadwalController.confirmJadwal);
router.delete("/jadwal/:id", authMiddleware.verifyToken, authMiddleware.restrictTo("admin"), jadwalController.delete);
router.delete("/jadwal/:id/status", authMiddleware.verifyToken, authMiddleware.restrictTo("ketua", "sekretaris"), jadwalController.deleteStatus);
router.get("/matkul-by-prodi", authMiddleware.verifyToken, authMiddleware.restrictTo("admin", "ketua", "sekretaris"), jadwalController.getMatkulByProdi); // Konsisten dengan penamaan

router.put("/pemesanan/confirm/:id", authMiddleware.verifyToken, authMiddleware.restrictTo("admin"), jadwalController.approveBooking); // Ubah confirmPemesanan menjadi approveBooking
router.put("/pemesanan/reject/:id", authMiddleware.verifyToken, authMiddleware.restrictTo("admin"), jadwalController.rejectBooking);

router.post("/jadwal/filter-matkul", authMiddleware.verifyToken, jadwalController.getFilteredMatkul);
router.post("/jadwal/filter-dosen", authMiddleware.verifyToken, jadwalController.getFilteredDosen);

module.exports = router;