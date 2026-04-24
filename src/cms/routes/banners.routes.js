// cms/routes/banners.routes.js
const router  = require('express').Router();
const ctrl    = require('../controllers/banners.controller');
const { adminAuth } = require('../middleware/adminAuth.middleware');
const { validate, createSchema, updateSchema } = require('../validators/banners.validator');

// Public — frontend calls this to render banners
router.get('/active', ctrl.listActive);

// Admin-protected routes
router.use(adminAuth);

router.post  ('/',                validate(createSchema), ctrl.create);
router.get   ('/',                                        ctrl.listAll);
router.get   ('/:id',                                     ctrl.getOne);
router.put   ('/:id',            validate(updateSchema),  ctrl.update);
router.patch ('/:id/publish',                             ctrl.publish);
router.patch ('/:id/unpublish',                           ctrl.unpublish);
router.delete('/:id',                                     ctrl.remove);

module.exports = router;