'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);

// Import the shared Sequelize instance
const sequelize = require('../config/db');
const db = {};

// Dynamically load all model files
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file)); // Loads ResetToken.js
    db[model.name] = model;
  });

// Call any built-in associate methods
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Apply custom associations
const defineAssociations = require('./Associations');
defineAssociations(db);
// Debug log
console.log('✅ Models loaded & associations applied! Employee associations:', Object.keys(db.Employee.associations || {}));

// Export
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;