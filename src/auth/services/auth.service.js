// auth/services/auth.service.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE = 'Banners';
const PK_USER = 'USER';
const PK_RESET = 'PASSWORD_RESET';
const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES = '7d';
const RESET_EXPIRES_MS = 60 * 60 * 1000; // 1 hour

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamo = DynamoDBDocumentClient.from(client);

function emailSk(email) {
  return `EMAIL#${String(email).trim().toLowerCase()}`;
}

function tokenSk(token) {
  return `TOKEN#${token}`;
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.userId,
      email: user.email,
      role: 'admin',
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

async function register({ email, password, name }) {
  const normalized = String(email).trim().toLowerCase();
  const sk = emailSk(normalized);

  const existing = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { PK: PK_USER, SK: sk } }),
  );
  if (existing.Item) {
    const err = new Error('An account with this email already exists');
    err.statusCode = 409;
    throw err;
  }

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  const item = {
    PK: PK_USER,
    SK: sk,
    userId,
    email: normalized,
    name: name || '',
    passwordHash,
    createdAt: now,
    updatedAt: now,
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

  const token = signToken({
    userId,
    email: normalized,
    name: item.name,
  });

  return {
    token,
    user: { id: userId, email: normalized, name: item.name },
  };
}

async function login({ email, password }) {
  const normalized = String(email).trim().toLowerCase();
  const sk = emailSk(normalized);

  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { PK: PK_USER, SK: sk } }),
  );
  if (!Item) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, Item.passwordHash);
  if (!ok) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const token = signToken({
    userId: Item.userId,
    email: Item.email,
    name: Item.name,
  });

  return {
    token,
    user: { id: Item.userId, email: Item.email, name: Item.name },
  };
}

async function forgotPassword({ email }) {
  const normalized = String(email).trim().toLowerCase();
  const sk = emailSk(normalized);

  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { PK: PK_USER, SK: sk } }),
  );

  const genericMsg =
    'If an account exists for that email, password reset instructions have been sent.';

  if (!Item) {
    return { message: genericMsg };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_EXPIRES_MS).toISOString();

  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: PK_RESET,
        SK: tokenSk(rawToken),
        userId: Item.userId,
        email: Item.email,
        expiresAt,
        createdAt: new Date().toISOString(),
      },
    }),
  );

  const base =
    process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${String(base).replace(/\/$/, '')}/reset-password?token=${rawToken}`;

  const payload = { message: genericMsg };
  if (process.env.AUTH_DEBUG === '1') {
    payload.debug = { resetToken: rawToken, resetLink };
  }

  return payload;
}

async function resetPassword({ token, password }) {
  if (!token || typeof token !== 'string') {
    const err = new Error('Invalid or expired reset link');
    err.statusCode = 400;
    throw err;
  }

  const { Item } = await dynamo.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: PK_RESET, SK: tokenSk(token) },
    }),
  );

  if (!Item) {
    const err = new Error('Invalid or expired reset link');
    err.statusCode = 400;
    throw err;
  }

  if (new Date(Item.expiresAt).getTime() < Date.now()) {
    await dynamo.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { PK: PK_RESET, SK: tokenSk(token) },
      }),
    );
    const err = new Error('Invalid or expired reset link');
    err.statusCode = 400;
    throw err;
  }

  const sk = emailSk(Item.email);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: PK_USER, SK: sk },
      UpdateExpression: 'SET passwordHash = :h, updatedAt = :u',
      ExpressionAttributeValues: {
        ':h': passwordHash,
        ':u': now,
      },
      ConditionExpression: 'attribute_exists(PK)',
    }),
  );

  await dynamo.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: PK_RESET, SK: tokenSk(token) },
    }),
  );

  return { message: 'Password updated. You can sign in with your new password.' };
}

/**
 * Prefer DynamoDB when the JWT includes email (login/register tokens).
 * If there is no matching row (e.g. dev script token), fall back to JWT claims.
 */
async function getCurrentUser(decoded) {
  if (!decoded || !decoded.sub) {
    const err = new Error('Invalid token');
    err.statusCode = 401;
    throw err;
  }

  const email = decoded.email;
  if (typeof email === 'string' && email.trim()) {
    const normalized = email.trim().toLowerCase();
    const sk = emailSk(normalized);
    const { Item } = await dynamo.send(
      new GetCommand({ TableName: TABLE, Key: { PK: PK_USER, SK: sk } }),
    );

    if (Item) {
      if (Item.userId !== decoded.sub) {
        const err = new Error('Session invalid. Please sign in again.');
        err.statusCode = 401;
        throw err;
      }
      return {
        id: Item.userId,
        email: Item.email,
        name: Item.name ?? '',
      };
    }
  }

  return {
    id: decoded.sub,
    email: typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : '',
    name: typeof decoded.name === 'string' ? decoded.name : '',
  };
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser,
};
