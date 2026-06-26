const { Sequelize } = require('sequelize');
const config = require('./env');
const logger = require('../utils/logger');

const isPostgres = config.databaseUrl && config.databaseUrl.startsWith('postgres');

const sequelize = config.env === 'production'
  ? new Sequelize(config.databaseUrl, {
      dialect: isPostgres ? 'postgres' : 'mysql',
      dialectOptions: isPostgres ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      } : {},
      logging: (msg) => logger.debug(`[db] ${msg}`),
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: './dev.sqlite',
      logging: false,
    });

async function connectDB() {
  try {
    await sequelize.authenticate();
    logger.info('[mysql] connected successfully.');
    
    // Sync models (always synchronize tables since we are not using database migrations)
    await sequelize.sync();
    logger.info('[database] database schema synchronized.');
  } catch (err) {
    logger.error(`[mysql] connection or synchronization error: ${err.message}`);
    throw err;
  }
}

module.exports = connectDB;
module.exports.sequelize = sequelize;
