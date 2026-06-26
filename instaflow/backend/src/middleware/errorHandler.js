const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(`[error] ${req.method} ${req.originalUrl} -> ${err.message}`, { stack: err.stack });

  const status = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(status).json({
    error: err.publicMessage || (status === 500 ? 'Internal server error' : err.message),
    ...(isProd ? {} : { stack: err.stack }),
  });
}

module.exports = errorHandler;
