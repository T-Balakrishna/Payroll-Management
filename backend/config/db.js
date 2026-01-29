const { Sequelize } = require('sequelize');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  username: process.env.DB_USER ,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ,
  dialect: process.env.DB_DIALECT || 'mysql',
  port: process.env.DB_PORT || 3306,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

module.exports = dbConfig;
