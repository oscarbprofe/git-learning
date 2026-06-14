// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  integrations: [preact(), mdx()],
  // `site` se omite por ahora: el sitio se publica en la URL que asigna Vercel.
  // Si más adelante agregas sitemap/canonical, define aquí tu URL real de Vercel.
  trailingSlash: 'never',
  adapter: vercel(),
});