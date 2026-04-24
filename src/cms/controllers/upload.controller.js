// cms/controllers/upload.controller.js
const svc = require('../services/upload.service');

async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded (use field name "file")' });
    }
    const { url, assetId } = await svc.uploadBannerImage({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      createdBy: req.user?.sub,
    });
    res.json({ success: true, data: { url, assetId } });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadImage };
