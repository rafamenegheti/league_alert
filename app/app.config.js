// Completa o app.json. O google-services.json (Firebase, para push no Android) é opcional:
// sem ele o app compila normalmente, só não recebe push no Android.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const googleServices = path.join(__dirname, 'google-services.json');
  if (!fs.existsSync(googleServices)) return config;
  return { ...config, android: { ...config.android, googleServicesFile: './google-services.json' } };
};
