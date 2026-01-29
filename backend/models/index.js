// models/index.js
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const dbConfig = require('../config/db'); // ← make sure this file exports correct config

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    // Optional but recommended in production
    dialectOptions: {
      // charset: 'utf8mb4',
      // collate: 'utf8mb4_unicode_ci',
      // dateStrings: true,
      // typeCast: true
    },
  }
);

// ────────────────────────────────────────────────
// Models container
// ────────────────────────────────────────────────
const db = {
  sequelize,
  Sequelize,
  DataTypes,
};

// Load models
const modelDir = __dirname;
const modelFiles = fs.readdirSync(modelDir)
  .filter(file =>
    file.indexOf('.') !== 0 &&           // skip hidden files
    file !== 'index.js' &&               // skip this file
    file.slice(-3) === '.js'             // only .js files
  );

modelFiles.forEach(file => {
  const modelPath = path.join(modelDir, file);
  const model = require(modelPath);

  let modelInstance;

  if (typeof model === 'function') {
    // Most common pattern: factory function
    modelInstance = model(sequelize, DataTypes);
  } else if (model && model.name) {
    // Rare: direct model export
    modelInstance = model;
  }

  if (modelInstance && modelInstance.name) {
    db[modelInstance.name] = modelInstance;
  }
});

// ────────────────────────────────────────────────
// Associations – must run AFTER all models are loaded
// ────────────────────────────────────────────────
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate && typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

module.exports = db;