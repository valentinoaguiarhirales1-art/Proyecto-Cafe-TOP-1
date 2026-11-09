const LOCAL_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000';

function getAllowedOrigins(value = process.env.CORS_ORIGINS) {
  return (value || LOCAL_ORIGINS)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

module.exports = getAllowedOrigins;
