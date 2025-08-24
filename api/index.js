// This file is the launcher for the API.
// It imports the app from server.js and starts the HTTP server.

const app = require('./server');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

module.exports = app;
