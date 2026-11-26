// @ts-check
import { defineConfig } from 'astro/config';

// 部署在 GitHub Pages 的專案網址：https://stanleybody.github.io/coc_agent/
export default defineConfig({
  site: 'https://stanleybody.github.io',
  base: '/coc_agent',
  trailingSlash: 'always',
});
