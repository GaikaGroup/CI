import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 3005,
    strictPort: true, // Fail if port is already in use instead of trying next port
    open: false, // Don't automatically open browser (prevents multiple tabs)
    hmr: {
      // Reduce HMR overhead to prevent connection leaks
      overlay: true
    },
    watch: {
      // Reduce file watching to prevent excessive reloads
      ignored: ['**/node_modules/**', '**/build/**', '**/coverage/**', '**/.git/**']
    }
  },
  optimizeDeps: {
    // Exclude Prisma from optimization to prevent multiple instances
    exclude: ['@prisma/client', 'prisma']
  }
});
