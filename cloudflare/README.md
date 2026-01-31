# Cloudflare Workers Deployment Guide

This guide explains how to deploy the contact form handler to Cloudflare Workers.

## Prerequisites

1. **Cloudflare Account**: Sign up at https://dash.cloudflare.com
2. **Wrangler CLI**: Install Cloudflare's CLI tool
   ```bash
   npm install -g wrangler
   # or
   pnpm add -g wrangler
   ```
3. **Resend Account**: Sign up at https://resend.com (free tier: 3,000 emails/month)
   - Get your API key from https://resend.com/api-keys
   - Verify your domain in Resend dashboard

## Step 1: Authenticate with Cloudflare

```bash
wrangler login
```

## Step 2: Create Cloudflare KV Namespace

KV (Key-Value) storage is used for rate limiting and suppression list:

```bash
# Create KV namespace for form submissions
wrangler kv:namespace create "SUBMISSIONS_KV"

# Note the output - you'll need the ID for wrangler.toml
# Example output: { binding = "SUBMISSIONS_KV", id = "abc123..." }
```

## Step 3: Configure wrangler.toml

Update `wrangler.toml` with your KV namespace ID:

```toml
name = "contact-form-worker"
main = "worker.js"
compatibility_date = "2024-01-01"

[env.production]
name = "contact-form-worker"

[[kv_namespaces]]
binding = "SUBMISSIONS_KV"
id = "YOUR_KV_NAMESPACE_ID"
```

## Step 4: Set Environment Variables

Set your Resend API key as a secret:

```bash
wrangler secret put RESEND_API_KEY
# When prompted, paste your Resend API key
```

## Step 5: Deploy the Worker

```bash
cd cloudflare
wrangler deploy
```

After deployment, you'll get a URL like:
`https://contact-form-worker.YOUR_SUBDOMAIN.workers.dev`

## Step 6: Update Contact Form

Update `src/components/contact.astro` to use your Cloudflare Worker URL instead of the AWS endpoint.

## Step 7: Configure Custom Domain (Optional)

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker
3. Go to Settings → Triggers
4. Add a custom route: `api.rapidsystemshub.com/contact`

Or use a subdomain:
- Add route: `contact.rapidsystemshub.com/*`

## Step 8: Set Up Resend Domain

1. Go to Resend Dashboard → Domains
2. Add your domain: `rapidsystemshub.com`
3. Add the DNS records Resend provides to your Cloudflare DNS
4. Wait for verification (usually a few minutes)

## Monitoring

View logs in real-time:
```bash
wrangler tail
```

View analytics in Cloudflare Dashboard:
- Workers & Pages → Your Worker → Analytics

## Rate Limiting

The worker uses Cloudflare KV for rate limiting:
- 2 minutes per email address
- Automatic expiration via KV TTL

## Suppression List

To add emails to suppression list (for bounced/complained addresses):

```bash
# Using Wrangler CLI
wrangler kv:key put "suppressed:email@example.com" "true" --binding SUBMISSIONS_KV

# Or via Cloudflare Dashboard
# Workers & Pages → KV → Your Namespace → Add Key
```

## Cost Estimate

**Cloudflare Workers:**
- Free tier: 100,000 requests/day
- Paid: $5/month for 10M requests

**Cloudflare KV:**
- Free tier: 100,000 reads/day, 1,000 writes/day
- Paid: $0.50 per million reads, $5 per million writes

**Resend:**
- Free tier: 3,000 emails/month
- Paid: $20/month for 50,000 emails

**Total for low-medium traffic:** FREE

## Troubleshooting

### Worker returns 500 error
- Check logs: `wrangler tail`
- Verify RESEND_API_KEY is set: `wrangler secret list`
- Check Resend API status: https://status.resend.com

### Emails not sending
- Verify domain is verified in Resend
- Check Resend dashboard for delivery status
- Review worker logs for errors

### Rate limiting not working
- Verify KV namespace is correctly bound in wrangler.toml
- Check KV namespace exists: `wrangler kv:namespace list`

## Alternative: Use Cloudflare Email Workers

If you prefer to use Cloudflare's Email Routing instead of Resend:

1. Enable Email Routing in Cloudflare Dashboard
2. Set up email addresses
3. Modify worker.js to use Cloudflare's Email API (if available)

Note: Cloudflare Email Routing is primarily for receiving emails, not sending. For sending, Resend or similar services are recommended.

## Security Features

- Honeypot field validation
- Input sanitization
- Rate limiting (2 minutes per email)
- Suppression list checking
- Timestamp validation (prevents replay attacks)
- CORS protection
- IP address logging

## Updating the Worker

After making changes:

```bash
cd cloudflare
wrangler deploy
```

The deployment is instant with zero downtime.
