function getHealthStatus(databaseReady) {
  return databaseReady
    ? { status: 'ok' }
    : { status: 'database_unavailable' };
}

module.exports = getHealthStatus;
