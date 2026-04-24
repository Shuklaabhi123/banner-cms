// cms/services/upload.service.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE = 'Banners';

const region = process.env.AWS_REGION;
const client = new DynamoDBClient({ region });
const dynamo = DynamoDBDocumentClient.from(client);
const s3 = new S3Client({ region });

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp']);

function publicUrlForKey(key) {
  const base = process.env.S3_PUBLIC_BASE_URL;
  if (base) {
    return `${base.replace(/\/$/, '')}/${key}`;
  }
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error('S3_BUCKET is not configured');
  if (region === 'us-east-1') {
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function extensionFromName(originalname, mimetype) {
  if (originalname && originalname.includes('.')) {
    const ext = originalname.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (IMAGE_EXT.has(ext)) return ext;
  }
  if (mimetype === 'image/jpeg') return 'jpg';
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/gif') return 'gif';
  if (mimetype === 'image/webp') return 'webp';
  if (mimetype === 'image/svg+xml') return 'svg';
  return 'jpg';
}

async function uploadBannerImage({ buffer, mimetype, originalname, createdBy }) {
  if (!region) {
    throw new Error('AWS_REGION is not configured');
  }
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('S3_BUCKET is not configured');
  }

  const assetId = uuidv4();
  const ext = extensionFromName(originalname, mimetype);
  const key = `banners/${assetId}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimetype || 'application/octet-stream',
    CacheControl: 'max-age=31536000',
  }));

  const url = publicUrlForKey(key);

  await dynamo.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: 'ASSET',
      SK: `ASSET#${assetId}`,
      assetId,
      url,
      s3Key: key,
      originalName: originalname || '',
      contentType: mimetype || '',
      createdAt: new Date().toISOString(),
      createdBy: createdBy || null,
    },
  }));

  return { url, assetId };
}

module.exports = { uploadBannerImage };
