const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Bus = sequelize.define('Bus', {
    busId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    busNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Registration number / Bus number plate (e.g. MH-01-AB-1234)',
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Friendly name (e.g. "Route 1 Express", "Employee Shuttle A")',
    },

    busDriverName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Name of the current/assigned driver',
    },

    location: {
      type: DataTypes.STRING(150),
      allowNull: true,
      comment: 'Base location / depot / starting point',
    },

    busRouteDetails: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Route description or key stops',
    },

    status: {
      type: DataTypes.ENUM('Active', 'Inactive', 'Maintenance', 'Out of Service'),
      allowNull: false,
      defaultValue: 'Active',
      comment: 'Current operational status of the bus',
    },

    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'companyId',
      },
      onDelete: 'CASCADE',
    },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
    },

  }, {
    tableName: 'buses',
    timestamps: true,
    paranoid: true, // soft deletes (optional but recommended)

    indexes: [
      {
        fields: ['companyId', 'busNumber'],
        unique: true,
        name: 'unique_company_bus_number',
      },
      {
        fields: ['status'],
        name: 'idx_bus_status',
      },
      {
        fields: ['companyId', 'status'],
        name: 'idx_company_status',
      },
    ],
  });

  // Associations (clean & consistent)
  Bus.associate = (models) => {
    Bus.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    Bus.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });

    Bus.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
    });

    // Very useful reverse association (most common use-case)
    Bus.hasMany(models.Employee, {
      foreignKey: 'busId',
      as: 'assignedEmployees',
    });
  };

  // Optional: Development-only table sync
  // if (process.env.NODE_ENV === 'development') {
  //   Bus.sync({ alter: true })
  //     .then(() => console.log('Bus table synced successfully'))
  //     .catch(err => console.error('Error syncing Bus table:', err));
  // }

  return Bus;
};