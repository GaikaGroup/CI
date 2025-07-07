# Frontend Instructions

This document provides instructions on how to run the AI Tutor Platform frontend and configure its settings.

## Running the Frontend

### Using the Shell Script

We've provided a shell script that makes it easy to start the frontend:

```bash
# Make sure the script is executable
chmod +x start-frontend.sh

# Run the script
./start-frontend.sh
```

This will start the development server on port 3000 and automatically open your browser.

### Using npm Directly

Alternatively, you can use npm commands directly:

```bash
# Install dependencies (if you haven't already)
npm install

# Start the development server
npm run dev

# Build for production
npm run build

# Preview the production build
npm run preview
```

## Port Configuration

By default, the frontend runs on port 3000. If you need to change this port:

1. Open `vite.config.js`
2. Modify the port number in the server configuration:

```
// In vite.config.js
export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 3000, // Change this to your desired port
    open: true  // Set to false if you don't want the browser to open automatically
  }
});
```

## Troubleshooting

If you encounter any issues:

1. Make sure all dependencies are installed by running `npm install`
2. Check that no other application is using port 3000 (or your configured port)
3. If the script doesn't run, ensure it has executable permissions: `chmod +x start-frontend.sh`
4. If you encounter an error about "@sveltejs/kit/vite" being ESM-only, ensure your package.json has `"type": "module"` specified:
   ```
   {
     "name": "sveltekit-tutor-site",
     "version": "1.0.0",
     "private": true,
     "type": "module",
     "scripts": {
       "dev": "vite dev",
       "build": "vite build",
       "preview": "vite preview"
     }
   }
   ```
   This is necessary because SvelteKit and many of its dependencies are ESM-only packages.
