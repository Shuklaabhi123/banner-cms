// cms/routes/upload.routes.js
const multer = require('multer');
const router = require('express').Router();
const { adminAuth } = require('../middleware/adminAuth.middleware');
const { upload } = require('../middleware/upload.middleware');
const ctrl = require('../controllers/upload.controller');

router.post('/image', adminAuth, upload.single('file'), ctrl.uploadImage);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image must be 5MB or smaller' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err && err.message === 'Only image files are allowed') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
