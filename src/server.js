const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;

createApp().listen(PORT, () => {
  console.log(`QuickBite running at http://localhost:${PORT}`);
});
