import { defineConfig } from '@lovable.dev/vite-tanstack-config';
import { cloudflare } from '@cloudflare/vite-plugin';

// Local dev only: the Cloudflare worker environment is populated from .env /
// .dev.vars, so platform-injected secrets available to the Vite process (e.g.
// LOVABLE_API_KEY) never reach server code. Inline them during `vite dev` so the
// chat route can use the Lovable AI Gateway in preview. Never inlined in builds.
const isDevServer = process.argv.includes('dev') || process.argv.includes('serve');
const devOnlySecrets = ['LOVABLE_API_KEY'];
const define: Record<string, string> = {};
if (isDevServer) {
  for (const name of devOnlySecrets) {
    const value = process.env[name];
    if (value) define[`process.env.${name}`] = JSON.stringify(value);
  }
}

// The locked helper uses Nitro by default. Disable that deploy adapter so the
// Cloudflare plugin builds src/server.ts with both fetch and scheduled exports.
// Keep the helper's existing React, Tailwind, aliases and import protection.
export default defineConfig({
  nitro: false,
  tanstackStart: { server: { entry: 'server' } },
  vite: { plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } })], define },
});
