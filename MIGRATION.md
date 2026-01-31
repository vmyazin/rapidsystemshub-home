# Migration Guide: npm to pnpm

This project now uses **pnpm** instead of npm for package management.

## Prerequisites

Install pnpm globally:

```bash
npm install -g pnpm
# or
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

## Installation

```bash
pnpm install
```

## Common Commands

| npm command | pnpm equivalent |
|------------|-----------------|
| `npm install` | `pnpm install` |
| `npm install <pkg>` | `pnpm add <pkg>` |
| `npm install -D <pkg>` | `pnpm add -D <pkg>` |
| `npm uninstall <pkg>` | `pnpm remove <pkg>` |
| `npm update` | `pnpm update` |
| `npm run <script>` | `pnpm <script>` or `pnpm run <script>` |

## Project Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm format       # Format code with Prettier
pnpm clean        # Clean build artifacts and dependencies
```

## Package Updates

The following packages have been updated to their latest versions:

### Major Updates:
- **Astro**: 4.1.1 → 5.1.4 (major version bump)
- **@astrojs/vercel**: 8.0.0 → 8.1.0
- **Rimraf**: 5.0.5 → 6.0.1

### Minor/Patch Updates:
- @astrojs/tailwind: 5.1.0 → 5.1.2
- @iconify-json packages: updated
- astro-icon: 1.0.2 → 1.1.1
- prettier: 3.1.1 → 3.4.2
- prettier-plugin-astro: 0.12.3 → 0.15.0
- prettier-plugin-tailwindcss: 0.5.11 → 0.6.9
- sharp: 0.33.1 → 0.33.5
- tailwindcss: 3.4.1 → 3.4.17
- tiny-invariant: 1.3.1 → 1.3.3

## Security Improvements

This update includes comprehensive security measures for the contact form:
- Honeypot field for bot detection
- Client-side input validation and sanitization
- Rate limiting (2-minute cooldown)
- Email header injection prevention
- Timestamp-based replay attack prevention

See `cloudflare/worker.js` for backend security implementation.

## Benefits of pnpm

- **Faster**: Up to 2x faster than npm
- **Disk efficient**: Saves disk space with content-addressable storage
- **Strict**: Better dependency resolution and no phantom dependencies
- **Monorepo-friendly**: Better support for workspaces

## Vercel Deployment

Vercel automatically detects pnpm when `pnpm-lock.yaml` is present. No configuration needed!

If you need to specify the pnpm version in Vercel, set:
- Environment variable: `PNPM_VERSION=9.15.4`

Or in `vercel.json`:
```json
{
  "buildCommand": "pnpm build"
}
```
