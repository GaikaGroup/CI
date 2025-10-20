import { handler } from './build/handler.js';
import express from 'express';

const app = express();

// Increase timeout for image processing requests
app.use((req, res, next) => {
  // Set timeout to 2 minutes for all requests
  req.setTimeout(120000);
  res.setTimeout(120000);
  next();
});

// Use SvelteKit handler
app.use(handler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port} with 2-minute timeout`);
});
