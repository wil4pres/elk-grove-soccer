#!/bin/bash
# Deploy egs-matching-worker to AWS Lambda
# Usage: bash deploy.sh [function-name]
# Default function name: egs-matching-worker
set -e
cd "$(dirname "$0")"

FUNCTION_NAME="${1:-egs-matching-worker}"
echo "▶ Deploying $FUNCTION_NAME..."

echo "  Installing dependencies..."
npm install --production 2>/dev/null

echo "  Installing dev dependencies for TypeScript..."
npm install --save-dev typescript @types/aws-lambda @types/node 2>/dev/null

echo "  Compiling TypeScript..."
npx tsc

echo "  Bundling..."
rm -rf .deploy matching-worker.zip
mkdir .deploy
cp -r dist/. .deploy/
cp -r node_modules .deploy/

cd .deploy
zip -r ../matching-worker.zip . -q
cd ..
rm -rf .deploy

SIZE=$(du -sh matching-worker.zip | cut -f1)
echo "  Package size: $SIZE"

echo "  Uploading to Lambda..."
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file fileb://matching-worker.zip \
  --output text --query 'FunctionName'

rm -f matching-worker.zip
echo "✅ Deployed $FUNCTION_NAME"
echo ""
echo "Reminder: Set ANTHROPIC_API_KEY in the Lambda environment variables."
echo "Lambda execution role must have DynamoDB access to egs-players and egs-matching-state."
