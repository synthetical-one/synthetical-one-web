import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://synthetical.one',
  integrations: [sitemap()],
  build: { format: 'directory' },
});
