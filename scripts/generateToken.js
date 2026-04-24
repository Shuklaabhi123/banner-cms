// scripts/generateToken.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Include email so /auth/me can load the real user from DynamoDB when that user exists.
// For a DB-less dev token, omit email — /auth/me will only return id/name from the JWT.
const token = jwt.sign(
  {
    sub: 'admin-user-001',
    role: 'admin',
    name: 'Test Admin',
    email: process.env.DEV_TOKEN_EMAIL || 'dev-admin@local.test',
  },
  process.env.JWT_SECRET,
  { expiresIn: '7d' },
);

console.log('Token:', token);