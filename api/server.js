import { createApp } from './app.js';
import connectDB from './lib/db.js';

const port = Number(process.env.PORT || 4000);

const app = createApp();

connectDB()
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`API listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start API:', err);
    process.exit(1);
  });
