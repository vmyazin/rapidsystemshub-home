# Lambda Function Deployment Guide

This directory contains the reference implementation for the secure contact form Lambda function.

## Prerequisites

- AWS CLI configured with appropriate credentials
- AWS account with permissions to create Lambda functions, API Gateway, and SES resources
- Node.js 18.x or later (for Lambda runtime)

## Setup Steps

### 1. Verify SES Email Addresses

Before deploying, verify the sender and recipient emails in Amazon SES:

```bash
aws ses verify-email-identity --email-address noreply@rapidsystemshub.com
aws ses verify-email-identity --email-address info@rapidsystemshub.com
```

Check verification status:
```bash
aws ses list-verified-email-addresses
```

### 2. Create IAM Role for Lambda

Create an IAM role with the following policies:
- `AWSLambdaBasicExecutionRole` (for CloudWatch Logs)
- Custom policy for SES send email permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. Package and Deploy Lambda Function

```bash
# Install dependencies
npm install aws-sdk

# Create deployment package
zip -r function.zip lambda-function-reference.js node_modules/

# Create Lambda function
aws lambda create-function \
  --function-name ContactFormHandler \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_LAMBDA_ROLE \
  --handler lambda-function-reference.handler \
  --zip-file fileb://function.zip \
  --timeout 10 \
  --memory-size 256
```

### 4. Configure API Gateway

1. Go to API Gateway in AWS Console
2. Update the existing API or create a new one
3. Configure CORS:
   - Allowed Origins: `https://www.rapidsystemshub.com`
   - Allowed Methods: `POST, OPTIONS`
   - Allowed Headers: `Content-Type`
4. Add resource policy to restrict access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "execute-api:/*",
      "Condition": {
        "StringEquals": {
          "aws:Referer": "https://www.rapidsystemshub.com/"
        }
      }
    }
  ]
}
```

### 5. Enable AWS WAF (Optional but Recommended)

For additional protection, attach AWS WAF to your API Gateway:

```bash
# Create WAF Web ACL with rate limiting rule
aws wafv2 create-web-acl \
  --name ContactFormWAF \
  --scope REGIONAL \
  --region us-east-1 \
  --default-action Allow={} \
  --rules file://waf-rules.json
```

Sample WAF rule for rate limiting (save as `waf-rules.json`):

```json
[
  {
    "Name": "RateLimitRule",
    "Priority": 1,
    "Statement": {
      "RateBasedStatement": {
        "Limit": 100,
        "AggregateKeyType": "IP"
      }
    },
    "Action": {
      "Block": {}
    },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "RateLimitRule"
    }
  }
]
```

### 6. Production Considerations

For production deployments, consider upgrading the rate limiting implementation:

#### Option A: Use DynamoDB for Rate Limiting

```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

async function checkRateLimit(key) {
  const params = {
    TableName: 'ContactFormRateLimits',
    Key: { id: key },
  };
  
  const result = await dynamodb.get(params).promise();
  if (result.Item && (Date.now() - result.Item.timestamp) < 120000) {
    return false; // Rate limited
  }
  
  // Update timestamp
  await dynamodb.put({
    TableName: 'ContactFormRateLimits',
    Item: {
      id: key,
      timestamp: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + 300, // 5 minutes TTL
    },
  }).promise();
  
  return true;
}
```

#### Option B: Use ElastiCache (Redis)

```javascript
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_ENDPOINT);

async function checkRateLimit(key) {
  const exists = await redis.get(key);
  if (exists) {
    return false; // Rate limited
  }
  
  await redis.set(key, '1', 'EX', 120); // 120 seconds
  return true;
}
```

## Monitoring

Set up CloudWatch alarms for:
- Lambda errors
- High invocation count
- Rate limit rejections
- SES send failures

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name ContactFormHighInvocations \
  --alarm-description "Alert when contact form receives too many invocations" \
  --metric-name Invocations \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## Testing

Test the Lambda function locally:

```bash
# Install SAM CLI
brew install aws-sam-cli

# Test locally
sam local invoke ContactFormHandler -e test-event.json
```

Sample `test-event.json`:

```json
{
  "body": "{\"body\":\"{\\\"name\\\":\\\"Test User\\\",\\\"email\\\":\\\"test@example.com\\\",\\\"message\\\":\\\"This is a test message\\\",\\\"optIn\\\":false,\\\"timestamp\\\":1738368000000}\"}",
  "requestContext": {
    "identity": {
      "sourceIp": "192.168.1.1"
    }
  }
}
```

## Security Checklist

- [ ] SES emails verified
- [ ] Lambda IAM role has minimum required permissions
- [ ] API Gateway CORS configured correctly
- [ ] Rate limiting implemented (Lambda + API Gateway)
- [ ] Honeypot validation active
- [ ] Input sanitization working
- [ ] CloudWatch logs enabled
- [ ] CloudWatch alarms configured
- [ ] AWS WAF attached (optional)
- [ ] Production rate limiting (DynamoDB/Redis) deployed

## Rollback

If you need to rollback to the old Lambda function:

```bash
# List versions
aws lambda list-versions-by-function --function-name ContactFormHandler

# Update alias to point to previous version
aws lambda update-alias \
  --function-name ContactFormHandler \
  --name prod \
  --function-version PREVIOUS_VERSION
```
