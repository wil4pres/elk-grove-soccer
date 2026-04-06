import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({
  region: process.env.DYNAMO_REGION ?? 'us-east-1',
  ...(process.env.DYNAMO_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.DYNAMO_ACCESS_KEY_ID,
      secretAccessKey: process.env.DYNAMO_SECRET_ACCESS_KEY!,
    },
  }),
})

export const db = DynamoDBDocumentClient.from(client)
