
const express = require('express');
  const app = express();
  const createAccountRoutes = require('./routes/create-account');

  // Enable JSON body parsing
  app.use(express.json());

  // Mount the route under /api (adjust if you prefer another prefix)
  app.use('/api', createAccountRoutes);

  // Start server (port as needed)
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
