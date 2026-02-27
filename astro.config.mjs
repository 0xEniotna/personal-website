import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://mecker.capital",
  output: "static",
  image: {
    domains: ["substackcdn.com", "substack-post-media.s3.amazonaws.com"],
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        if (pathname.startsWith("/legal/")) {
          return false;
        }

        return !/^\/writings\/\d+\/?$/.test(pathname);
      },
    }),
  ],
});
