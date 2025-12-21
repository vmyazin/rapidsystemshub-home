// astro.config.mjs
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";
import vercel from "@astrojs/vercel";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
    site: process.env.SITE_URL || "https://www.rapidsystemshub.com/",
    output: "static",
    adapter: vercel({
        webAnalytics: { enabled: true },
    }),
    integrations: [tailwind(), icon()],
});