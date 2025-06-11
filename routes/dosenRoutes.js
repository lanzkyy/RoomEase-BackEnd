// routes/dosenRoutes.js
const express = require("express");
const router = express.Router();
const dosenController = require("../controllers/dosenController");
const authMiddleware = require("../middleware/authMiddleware");

// Mengizinkan admin, ketua, dan sekretaris untuk mengakses daftar dosen
router.get("/", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  dosenController.getAll
);

router.get("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  dosenController.getById
);

router.post("/", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  dosenController.createDosen
);

router.put("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  dosenController.updateDosen
);

router.delete("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  dosenController.deleteDosen
);

module.exports = router;