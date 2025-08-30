const express = require('express');
const path = require('path');
const app = express();

// ... your existing middleware, routes, API, etc.

// Serve static frontend assets (if you have a built dashboard in public/)
app.use(express.static(path.join(__dirname, 'public')));

// Your API routes above...
// Example: app.use('/api', require('./routes/api'));

// 404 handler (must come after all route definitions)
app.use((req, res, next) => {
  // If it's an API request, you might want a JSON 404 instead
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not Found', path: req.originalUrl });
  }
  // Serve custom 404 HTML for frontend routes
  res.status(404);
  res.type('text/html');
  res.sendFile(path.join(__dirname, 'public/404.html')); // ensure path matches your setup
});

// Optional: global error handler (see next)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Do not leak stack traces in production
  res.status(500);
  res.type('text/html');
  res.sendFile(path.join(__dirname, 'public/500.html'));
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
