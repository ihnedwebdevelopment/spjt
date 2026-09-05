import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Cloudflare Pages serves `realizace.html` at `/realizace`. Tento plugin dělá
 * totéž v `vite dev` i `vite preview`, aby se web choval stejně jako v produkci.
 */
function extensionlessHtml() {
  const middleware = (root) => (req, _res, next) => {
    const [pathname, query] = (req.url || '/').split('?');
    if (pathname !== '/' && !pathname.includes('.')) {
      const candidate = join(root, `${decodeURIComponent(pathname).replace(/^\/+/, '')}.html`);
      if (existsSync(candidate)) req.url = `${pathname}.html${query ? `?${query}` : ''}`;
    }
    next();
  };
  return {
    name: 'extensionless-html',
    configureServer(server) {
      server.middlewares.use(middleware(server.config.root));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(join(server.config.root, server.config.build.outDir)));
    },
  };
}

export default defineConfig({ plugins: [svelte(), tailwindcss(), extensionlessHtml()] });
