// middleware/validationMiddleware.js
const Joi = require('joi');

const registerSchema = Joi.object({
  nama_pengguna: Joi.string().max(50).required().messages({
    'string.max': 'Nama pengguna tidak boleh lebih dari 50 karakter',
    'any.required': 'Nama pengguna wajib diisi'
  }),
  kata_sandi: Joi.string().min(6).required().messages({
    'string.min': 'Kata sandi harus minimal 6 karakter',
    'any.required': 'Kata sandi wajib diisi'
  }),
  peran: Joi.string().valid('ketua', 'sekretaris', 'admin').required().messages({
    'any.only': 'Peran harus salah satu dari: ketua, sekretaris, admin',
    'any.required': 'Peran wajib diisi'
  }),
  no_telepon: Joi.string().pattern(/^[0-9]{10,13}$/).required().messages({
    'string.pattern.base': 'Nomor telepon harus 10-13 digit angka tanpa tanda "+"',
    'any.required': 'Nomor telepon wajib diisi'
  }),
  email: Joi.string().email().max(255).optional().messages({
    'string.email': 'Email harus dalam format yang valid',
    'string.max': 'Email tidak boleh lebih dari 255 karakter'
  })
});

const registerByAdminSchema = Joi.object({
  nama_pengguna: Joi.string().max(50).required().messages({
    'string.max': 'Nama pengguna tidak boleh lebih dari 50 karakter',
    'any.required': 'Nama pengguna wajib diisi'
  }),
  kata_sandi: Joi.string().min(6).required().messages({
    'string.min': 'Kata sandi harus minimal 6 karakter',
    'any.required': 'Kata sandi wajib diisi'
  }),
  peran: Joi.string().valid('ketua', 'sekretaris').required().messages({
    'any.only': 'Peran harus salah satu dari: ketua, sekretaris',
    'any.required': 'Peran wajib diisi'
  }),
  no_telepon: Joi.string().pattern(/^[0-9]{10,13}$/).required().messages({
    'string.pattern.base': 'Nomor telepon harus 10-13 digit angka tanpa tanda "+"',
    'any.required': 'Nomor telepon wajib diisi'
  }),
  email: Joi.string().email().max(255).required().messages({
    'string.email': 'Email harus dalam format yang valid',
    'string.max': 'Email tidak boleh lebih dari 255 karakter',
    'any.required': 'Email wajib diisi'
  }),
  id_kelas: Joi.number().integer().required().messages({
    'number.base': 'ID kelas harus berupa angka',
    'any.required': 'ID kelas wajib diisi'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email harus dalam format yang valid',
    'any.required': 'Email wajib diisi'
  }),
  kata_sandi: Joi.string().min(6).required().messages({
    'string.min': 'Kata sandi harus minimal 6 karakter',
    'any.required': 'Kata sandi wajib diisi'
  })
});

const jadwalSchema = Joi.object({
  id_kelas: Joi.number().integer().required().messages({
    'number.base': 'ID kelas harus berupa angka',
    'any.required': 'ID kelas wajib diisi'
  }),
  id_matkul: Joi.number().integer().required().messages({
    'number.base': 'ID mata kuliah harus berupa angka',
    'any.required': 'ID mata kuliah wajib diisi'
  }),
  id_dosen: Joi.number().integer().required().messages({
    'number.base': 'ID dosen harus berupa angka',
    'any.required': 'ID dosen wajib diisi'
  }),
  id_ruangan: Joi.number().integer().required().messages({
    'number.base': 'ID ruangan harus berupa angka',
    'any.required': 'ID ruangan wajib diisi'
  }),
  hari: Joi.string().valid('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu').required().messages({
    'any.only': 'Hari harus salah satu dari: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu',
    'any.required': 'Hari wajib diisi'
  }),
  jam_mulai: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'Jam mulai harus dalam format HH:MM (contoh: 08:00)',
    'any.required': 'Jam mulai wajib diisi'
  }),
  jam_selesai: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'Jam selesai harus dalam format HH:MM (contoh: 10:00)',
    'any.required': 'Jam selesai wajib diisi'
  })
});

const otpSendSchema = Joi.object({
  no_telepon: Joi.string().pattern(/^[0-9]{10,13}$/).required().messages({
    'string.pattern.base': 'Nomor telepon harus 10-13 digit angka tanpa tanda "+"',
    'any.required': 'Nomor telepon wajib diisi'
  })
});

const otpVerifySchema = Joi.object({
  no_telepon: Joi.string().pattern(/^[0-9]{10,13}$/).required().messages({
    'string.pattern.base': 'Nomor telepon harus 10-13 digit angka tanpa tanda "+"',
    'any.required': 'Nomor telepon wajib diisi'
  }),
  otp: Joi.string().pattern(/^[0-9]{6}$/).required().messages({
    'string.pattern.base': 'OTP harus 6 digit angka',
    'any.required': 'OTP wajib diisi'
  })
});

const validateRegister = (req, res, next) => {
  const { error } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

const validateRegisterByAdmin = (req, res, next) => {
  const { error } = registerByAdminSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

const validateLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

const validateJadwal = (req, res, next) => {
  const { error } = jadwalSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

const validateOtpSend = (req, res, next) => {
  const { error } = otpSendSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

const validateOtpVerify = (req, res, next) => {
  const { error } = otpVerifySchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  next();
};

module.exports = { 
  validateRegister, 
  validateRegisterByAdmin, 
  validateLogin, 
  validateJadwal, 
  validateOtpSend, 
  validateOtpVerify 
};