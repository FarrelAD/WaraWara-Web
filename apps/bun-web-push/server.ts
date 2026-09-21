import { app } from './src/app.js';
import { config } from './src/config.js';

// Start Bun Express Server
app.listen(config.port, () => {
  console.log('=======================================================');
  console.log(`🚀 Bun Web Push Express Server running at http://localhost:${config.port}`);
  console.log(`⚡ Runtime: Bun v${Bun.version}`);
  console.log('=======================================================');
});
