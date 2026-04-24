// scripts/createBannersTable.js
// Stores banner rows (PK=BANNER, SK=BANNER#<id>) and uploaded image metadata
// (PK=ASSET, SK=ASSET#<id>) in the same table — no extra table is required for uploads.
const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

async function createTable() {
  await client.send(new CreateTableCommand({
    TableName: 'Banners',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'PK',        AttributeType: 'S' },
      { AttributeName: 'SK',        AttributeType: 'S' },
      { AttributeName: 'status',    AttributeType: 'S' },
      { AttributeName: 'startDate', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH'  },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    GlobalSecondaryIndexes: [{
      IndexName: 'StatusPageIndex',
      KeySchema: [
        { AttributeName: 'status',    KeyType: 'HASH'  },
        { AttributeName: 'startDate', KeyType: 'RANGE' },
      ],
      Projection: { ProjectionType: 'ALL' },
    }],
  }));

  console.log('Banners table created.');
}

createTable().catch(console.error);