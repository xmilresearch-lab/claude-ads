import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  output: 'static',
  site: 'https://yoursaas.com',
  compressHTML: true,
  build: {
    assets: '_assets',
  },
});
