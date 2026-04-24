require('dotenv').config();
const cors = require('cors');

const express      = require('express');
const bannerRoutes = require('./cms/routes/banners.routes');
const uploadRoutes = require('./cms/routes/upload.routes');
const authRoutes = require('./auth/routes/auth.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow all origins
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);

// CMS Routes
app.use('/cms/upload', uploadRoutes);
app.use('/cms/banners', bannerRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const message = err.message && typeof err.message === 'string' ? err.message : 'Something went wrong';
  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});