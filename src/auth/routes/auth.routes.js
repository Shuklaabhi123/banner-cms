// auth/routes/auth.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  validate,
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
} = require('../validators/auth.validator');

router.post('/register', validate(registerSchema), ctrl.register);
router.post('/login', validate(loginSchema), ctrl.login);
router.post('/forgot-password', validate(forgotSchema), ctrl.forgotPassword);
router.post('/reset-password', validate(resetSchema), ctrl.resetPassword);
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
