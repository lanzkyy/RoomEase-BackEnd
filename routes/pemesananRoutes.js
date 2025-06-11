// routes/pemesananRoutes.js
const express = require("express");
const router = express.Router();
const PemesananController = require("../controllers/pemesananController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  PemesananController.getAll
);

router.get("/my-bookings", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("ketua", "sekretaris"), 
  PemesananController.getMyBookings
);

router.get("/bookings", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin"), 
  PemesananController.getBookingsAdmin
);

router.get("/available-rooms", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("ketua", "sekretaris"), 
  PemesananController.getAvailableRooms
);

router.get("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  PemesananController.getById
);

router.post("/", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("ketua", "sekretaris"), 
  PemesananController.create
);

router.put("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("ketua", "sekretaris"), 
  PemesananController.update
);

router.put("/:id/status", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  PemesananController.updateBookingStatus
);

router.delete("/:id", 
  authMiddleware.verifyToken, 
  authMiddleware.restrictTo("admin", "ketua", "sekretaris"), 
  PemesananController.delete
);

module.exports = router;