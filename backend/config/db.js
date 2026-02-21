import { Sequelize } from 'sequelize';
import dotenv from "dotenv";
dotenv.config();
// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  username: process.env.DB_USER ,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ,
  dialect: process.env.DB_DIALECT || 'mysql',
  port: process.env.DB_PORT || 3306,
  timezone: process.env.DB_TIMEZONE || '+05:30',
  logging: process.env.LOG_LEVEL === 'debug' ? console.log : false,
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

export default dbConfig;
