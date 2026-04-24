// cms/services/banners.service.js
const { DynamoDBClient }            = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient,
        PutCommand, GetCommand,
        QueryCommand, UpdateCommand,
        DeleteCommand }             = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 }               = require('uuid');

const client  = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamo  = DynamoDBDocumentClient.from(client);
const TABLE   = 'Banners';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeKeys(bannerId) {
  return { PK: 'BANNER', SK: `BANNER#${bannerId}` };
}

function strip(item) {
  // Remove DynamoDB internal keys before returning to client
  const { PK, SK, ...rest } = item;
  return rest;
}

/** Lowercase + dedupe so contains(targetPages, :page) matches GET /active?page=… */
function normalizeTargetPages(pages) {
  if (!Array.isArray(pages)) return [];
  return [...new Set(pages.map((p) => String(p).trim().toLowerCase()))];
}

// ── CREATE ────────────────────────────────────────────────────────────────────

async function createBanner(data) {
  const bannerId  = uuidv4();
  const now       = new Date().toISOString();

  const item = {
    ...makeKeys(bannerId),
    bannerId,
    title:        data.title,
    templateType: data.templateType,    // 'hero' | 'strip' | 'popup' | 'card'
    targetPages:  normalizeTargetPages(data.targetPages), // e.g. ['home', 'cart']
    contentJSON:  data.contentJSON,     // template-specific fields
    status:       data.status ?? 'draft',
    priority:     data.priority ?? 0,
    startDate:    data.startDate ?? now,
    endDate:      data.endDate ?? null,
    createdAt:    now,
    updatedAt:    now,
    createdBy:    data.createdBy,
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
  return strip(item);
}

// ── GET ONE ───────────────────────────────────────────────────────────────────

async function getBannerById(bannerId) {
  const { Item } = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: makeKeys(bannerId),
  }));
  return Item ? strip(Item) : null;
}

// ── LIST ALL (admin — all statuses) ──────────────────────────────────────────

async function listAllBanners() {
  const { Items } = await dynamo.send(new QueryCommand({
    TableName:                TABLE,
    KeyConditionExpression:   'PK = :pk',
    ExpressionAttributeValues: { ':pk': 'BANNER' },
  }));
  return (Items ?? []).map(strip);
}

// ── LIST ACTIVE (frontend — by page) ─────────────────────────────────────────
// Query PK = BANNER (no GSI) so this works even if StatusPageIndex was never created.

async function getActiveBanners(page) {
  const normalizedPage = String(page ?? 'home').trim().toLowerCase();
  const now = new Date().toISOString();

  const { Items } = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeNames: {
      '#st': 'status',
    },
    ExpressionAttributeValues: {
      ':pk': 'BANNER',
      ':active': 'active',
      ':now': now,
      ':page': normalizedPage,
      ':empty': '',
    },
    FilterExpression:
      '#st = :active AND contains(targetPages, :page) AND startDate <= :now AND ' +
      '(attribute_not_exists(endDate) OR endDate = :empty OR endDate >= :now)',
  }));

  return (Items ?? [])
    .map(strip)
    .sort((a, b) => b.priority - a.priority);
}
// ── UPDATE ────────────────────────────────────────────────────────────────────

async function updateBanner(bannerId, updates) {
  const payload = { ...updates };
  if (payload.targetPages != null) {
    payload.targetPages = normalizeTargetPages(payload.targetPages);
  }
  const fields  = Object.entries({ ...payload, updatedAt: new Date().toISOString() });
  const expParts = fields.map(([k], i) => `#f${i} = :v${i}`);
  const names    = Object.fromEntries(fields.map(([k], i) => [`#f${i}`, k]));
  const values   = Object.fromEntries(fields.map(([, v], i) => [`:v${i}`, v]));

  const { Attributes } = await dynamo.send(new UpdateCommand({
    TableName:                TABLE,
    Key:                      makeKeys(bannerId),
    UpdateExpression:         `SET ${expParts.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression:      'attribute_exists(PK)',
    ReturnValues:             'ALL_NEW',
  }));

  return strip(Attributes);
}

// ── DELETE ────────────────────────────────────────────────────────────────────

async function deleteBanner(bannerId) {
  await dynamo.send(new DeleteCommand({
    TableName:          TABLE,
    Key:                makeKeys(bannerId),
    ConditionExpression: 'attribute_exists(PK)',
  }));
  return { deleted: true, bannerId };
}

// ── PUBLISH / UNPUBLISH shortcuts ─────────────────────────────────────────────

async function publishBanner(bannerId) {
  return updateBanner(bannerId, { status: 'active' });
}

async function unpublishBanner(bannerId) {
  return updateBanner(bannerId, { status: 'draft' });
}

module.exports = {
  createBanner, getBannerById, listAllBanners,
  getActiveBanners, updateBanner, deleteBanner,
  publishBanner, unpublishBanner,
};