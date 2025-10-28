import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 3000,
    open: true, // Automatically open the browser
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
