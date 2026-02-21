// models/index.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Sequelize, DataTypes } from 'sequelize';
import dbConfig from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    timezone: dbConfig.timezone ?? '+05:30',
    logging: dbConfig.logging ?? false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: dbConfig.dialectOptions ?? {},
  }
);

const db = {
  sequelize,
  Sequelize,
  DataTypes,
};

const modelDir = __dirname;
const files = fs.readdirSync(modelDir).filter((file) =>
  file.indexOf('.') !== 0 && file !== 'index.js' && file.endsWith('.js')
);

for (const file of files) {
  const modelPath = path.join(modelDir, file);
  const modelModule = await import(pathToFileURL(modelPath).href);
  const model = modelModule.default ?? modelModule;

  let modelInstance;
  if (typeof model === 'function') {
    modelInstance = model(sequelize, DataTypes);
  } else if (model && model.name) {
    modelInstance = model;
  }

  if (modelInstance && modelInstance.name) {
    db[modelInstance.name] = modelInstance;
  }
}

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate && typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

export default db;
