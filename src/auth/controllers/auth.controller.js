// auth/controllers/auth.controller.js
const svc = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const data = await svc.register(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    if (e.statusCode) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    next(e);
  }
}

async function login(req, res, next) {
  try {
    const data = await svc.login(req.body);
    res.json({ success: true, data });
  } catch (e) {
    if (e.statusCode) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    next(e);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const data = await svc.forgotPassword(req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function resetPassword(req, res, next) {
  try {
    const data = await svc.resetPassword(req.body);
    res.json({ success: true, data });
  } catch (e) {
    if (e.statusCode) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    next(e);
  }
}

async function me(req, res, next) {
  try {
    const user = await svc.getCurrentUser(req.user);
    res.json({ success: true, data: { user } });
  } catch (e) {
    if (e.statusCode) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    next(e);
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  me,
};
