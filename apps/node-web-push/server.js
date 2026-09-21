const { app } = require('./src/app.js');
const { config } = require('./src/config.js');

// Start Server
app.listen(config.port, () => {
  console.log('=======================================================');
  console.log(`Web Push Demo Server running at http://localhost:${config.port}`);
  console.log('=======================================================');
});
