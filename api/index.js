const http = require('http');
const app = require('./server');

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on port ${PORT}`);
});
