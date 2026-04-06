import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({
  region: process.env.DYNAMO_REGION ?? 'us-east-1',
})

export const db = DynamoDBDocumentClient.from(client)
