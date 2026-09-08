import { defineConfig } from '@lovable.dev/vite-tanstack-config';
import { cloudflare } from '@cloudflare/vite-plugin';

// The locked helper uses Nitro by default. Disable that deploy adapter so the
// Cloudflare plugin builds src/server.ts with both fetch and scheduled exports.
// Keep the helper's existing React, Tailwind, aliases and import protection.
export default defineConfig({
  nitro: false,
  tanstackStart: { server: { entry: 'server' } },
  vite: { plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } })] },
});
