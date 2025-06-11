// routes/ruanganRoutes.js
const express = require("express");
const router = express.Router();
const RuanganController = require("../controllers/ruanganController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/status", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  RuanganController.getRoomStatus
);
router.get("/public/status", RuanganController.getPublicRoomStatus);

// Authenticated routes (admin, ketua, sekretaris)
router.get("/", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  RuanganController.getAll
);

router.get("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  RuanganController.getById
);

// Admin-only routes
router.post("/", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  RuanganController.create
);

router.put("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  RuanganController.update
);

router.delete("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  RuanganController.delete
);

module.exports = router;