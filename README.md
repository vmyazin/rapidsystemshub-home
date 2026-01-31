# Rapid Systems Hub Home Page

## Features

- 💨 Tailwind CSS for styling
- 🎨 Themeable
  - CSS variables are defined in `src/styles/theme.css` and mapped to Tailwind classes (`tailwind.config.cjs`)
- 🌙 Dark mode
- 📱 Responsive (layout, images, typography)
- ♿ Accessible (as measured by https://web.dev/measure/)
- 🔎 SEO-enabled (as measured by https://web.dev/measure/)
- 🔗 Open Graph tags for social media sharing
- 💅 [Prettier](https://prettier.io/) setup for both [Astro](https://github.com/withastro/prettier-plugin-astro) and [Tailwind](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)
- 🛡️ Security-hardened contact form with honeypot, rate limiting, and input validation

## Package Manager

This project uses **pnpm** for faster and more efficient dependency management.

Install pnpm globally:
```bash
npm install -g pnpm
```

## Commands

| Command                 | Action                                            |
| :---------------------- | :------------------------------------------------ |
| `pnpm install`          | Install dependencies                              |
| `pnpm dev`              | Start local dev server at `localhost:4321`        |
| `pnpm build`            | Build your production site to `./dist/`           |
| `pnpm preview`          | Preview your build locally, before deploying      |
| `pnpm astro ...`        | Run CLI commands like `astro add`, `astro check`  |
| `pnpm astro --help`     | Get help using the Astro CLI                      |
| `pnpm format`           | Format code with [Prettier](https://prettier.io/) |
| `pnpm clean`            | Remove `node_modules` and build output            |

## Security

The contact form includes multiple layers of security:
- **Honeypot field**: Invisible field that bots fill out, triggering silent rejection
- **Client-side rate limiting**: 2-minute cooldown between submissions
- **Input validation**: Email format, length limits, and character restrictions
- **Header injection prevention**: Strips dangerous characters that could manipulate email headers
- **Server-side validation**: Cloudflare Worker with rate limiting and suppression list checking

## Contact Form Backend

The contact form is handled by a **Cloudflare Worker** that processes submissions and sends emails via Resend.

- **Deployment**: See `cloudflare/README.md` for setup instructions
- **Migration**: See `cloudflare/MIGRATION.md` for migration from AWS SES
- **Environment**: Set `PUBLIC_CONTACT_FORM_URL` to your Cloudflare Worker URL

See `MIGRATION.md` for pnpm migration details and `cloudflare/` for backend deployment.

## Credits

- astronaut image
  - source: https://github.com/withastro/astro-og-image; note: this repo is not available anymore
- moon image
  - source: https://unsplash.com/@nasa
- other than that, a lot of material (showcase data, copy) was taken from official Astro sources, in particular https://astro.build/blog/introducing-astro/ and https://github.com/withastro/astro.build

<div align="center">

[![Built with Astro](https://astro.badg.es/v2/built-with-astro/small.svg)](https://astro.build)

</div>
