# Cloudflare Migration Guide

This document explains how to migrate from AWS SES to Cloudflare Workers for contact form handling.

## Why Migrate to Cloudflare?

- **No bounce rate issues**: Cloudflare Workers + Resend handles email delivery without SES reputation concerns
- **Better performance**: Edge computing with global distribution
- **Cost effective**: Free tier covers most use cases
- **Simpler setup**: No AWS IAM roles, API Gateway, or SES configuration
- **Better developer experience**: Instant deployments, easy debugging

## Migration Steps

### 1. Set Up Resend Account

1. Sign up at https://resend.com
2. Verify your domain `rapidsystemshub.com`
3. Get your API key from https://resend.com/api-keys

### 2. Deploy Cloudflare Worker

Follow the instructions in `README.md` (this folder) to:
- Create KV namespace
- Deploy the worker
- Set environment variables

### 3. Update Environment Variables

Add to your deployment platform (Vercel):

```
PUBLIC_CONTACT_FORM_URL=https://contact-form-worker.YOUR_SUBDOMAIN.workers.dev
```

Or update `src/components/contact.astro` directly with your worker URL.

### 4. Test the Form

1. Submit a test form submission
2. Check Resend dashboard for email delivery
3. Verify rate limiting works (try submitting twice quickly)

### 5. Clean Up AWS Resources (Optional)

Once everything is working:

1. Delete AWS Lambda function
2. Delete API Gateway endpoint
3. Disable SES (or keep for other uses)
4. Remove AWS-related documentation

## What Changes?

### Before (AWS SES)
- Form → AWS API Gateway → Lambda → SES → Email
- Complex IAM roles and permissions
- SES bounce rate monitoring required
- AWS-specific configuration

### After (Cloudflare)
- Form → Cloudflare Worker → Resend API → Email
- Simple API key authentication
- No bounce rate concerns (handled by Resend)
- Cloudflare KV for rate limiting

## Benefits

1. **No More Bounce Rate Issues**: Resend handles reputation management
2. **Global Edge Network**: Faster response times worldwide
3. **Simpler Architecture**: One worker file vs multiple AWS services
4. **Better Logging**: Cloudflare Analytics + Resend dashboard
5. **Cost Savings**: Free tier covers most needs

## Monitoring

- **Cloudflare Dashboard**: Worker invocations, errors, performance
- **Resend Dashboard**: Email delivery status, opens, clicks
- **Wrangler CLI**: Real-time logs with `wrangler tail`

## Rollback Plan

If you need to rollback to AWS:

1. Keep AWS Lambda function deployed (but disabled)
2. Update `contact.astro` to use AWS endpoint
3. Re-enable Lambda function

## Support

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Resend Docs: https://resend.com/docs
- Cloudflare Community: https://community.cloudflare.com/
