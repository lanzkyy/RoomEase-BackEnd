// routes/matkulRoutes.js
const express = require("express");
const router = express.Router();
const MatkulController = require("../controllers/matkulController");
const authMiddleware = require("../middleware/authMiddleware");

// Mengizinkan admin, ketua, dan sekretaris untuk mengakses daftar mata kuliah
router.get("/", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  MatkulController.getAll
);

router.get("/filter", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  MatkulController.getAll
);

router.get("/prodi", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  MatkulController.getProdi
);

// Admin-only routes
router.get("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  MatkulController.getById
);

router.post("/", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  MatkulController.create
);

router.put("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  MatkulController.update
);

router.delete("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  MatkulController.delete
);

module.exports = router;