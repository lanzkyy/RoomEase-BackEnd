// routes/kelasRoutes.js
const express = require("express");
const router = express.Router();
const KelasController = require("../controllers/kelasController");
const authMiddleware = require("../middleware/authMiddleware");

// Hanya admin yang bisa mengakses rute ini
router.get("/", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  KelasController.getAll
);

router.get("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  KelasController.getById
);

router.post("/", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  KelasController.create
);

router.put("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  KelasController.update
);

router.delete("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  KelasController.delete
);

// Public endpoint to get all classes
router.get("/public", KelasController.getAllPublic);

module.exports = router;