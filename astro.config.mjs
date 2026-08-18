// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages 用户站点，部署在根路径
  site: 'https://diyuyizhu.github.io',
  base: '/',
  integrations: [sitemap()],
});
