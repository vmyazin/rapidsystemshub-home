# Environment Variables

## For Astro Build (Vercel/Deployment)

```
PUBLIC_CONTACT_FORM_URL=https://contact-form-worker.YOUR_SUBDOMAIN.workers.dev
```

Set this in your Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add `PUBLIC_CONTACT_FORM_URL` with your Cloudflare Worker URL
3. Redeploy

## For Cloudflare Worker

Set these via Wrangler CLI:

```bash
wrangler secret put RESEND_API_KEY
```

Or in Cloudflare Dashboard:
- Workers & Pages → Your Worker → Settings → Variables

Required secrets:
- `RESEND_API_KEY`: Your Resend API key from https://resend.com/api-keys
