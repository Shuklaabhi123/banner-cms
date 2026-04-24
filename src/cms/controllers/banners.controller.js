// cms/controllers/banners.controller.js
const svc = require('../services/banners.service');

const handleError = (res, err) => {
  console.error(err);
  if (err.name === 'ConditionalCheckFailedException') {
    return res.status(404).json({ error: 'Banner not found' });
  }
  res.status(500).json({ error: 'Internal server error' });
};

// POST /cms/banners
async function create(req, res) {
  try {
    const banner = await svc.createBanner({ ...req.body, createdBy: req.user?.sub });
    res.status(201).json({ success: true, data: banner });
  } catch (err) { handleError(res, err); }
}

// GET /cms/banners (admin — all)
async function listAll(req, res) {
  try {
    const banners = await svc.listAllBanners();
    res.json({ success: true, data: banners, count: banners.length });
  } catch (err) { handleError(res, err); }
}

// GET /cms/banners/active?page=home (frontend)
async function listActive(req, res) {
  try {
    const raw = req.query.page ?? 'home';
    const page = String(raw).trim().toLowerCase();
    const banners = await svc.getActiveBanners(page);
    res.json({ success: true, data: banners });
  } catch (err) { handleError(res, err); }
}

// GET /cms/banners/:id
async function getOne(req, res) {
  try {
    const banner = await svc.getBannerById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    res.json({ success: true, data: banner });
  } catch (err) { handleError(res, err); }
}

// PUT /cms/banners/:id
async function update(req, res) {
  try {
    const banner = await svc.updateBanner(req.params.id, req.body);
    res.json({ success: true, data: banner });
  } catch (err) { handleError(res, err); }
}

// PATCH /cms/banners/:id/publish
async function publish(req, res) {
  try {
    const banner = await svc.publishBanner(req.params.id);
    res.json({ success: true, data: banner });
  } catch (err) { handleError(res, err); }
}

// PATCH /cms/banners/:id/unpublish
async function unpublish(req, res) {
  try {
    const banner = await svc.unpublishBanner(req.params.id);
    res.json({ success: true, data: banner });
  } catch (err) { handleError(res, err); }
}

// DELETE /cms/banners/:id
async function remove(req, res) {
  try {
    const result = await svc.deleteBanner(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { handleError(res, err); }
}

module.exports = { create, listAll, listActive, getOne, update, publish, unpublish, remove };