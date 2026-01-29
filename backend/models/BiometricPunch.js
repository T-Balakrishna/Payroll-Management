const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BiometricPunch = sequelize.define('BiometricPunch', {
    punchId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'employeeId',
      },
      onDelete: 'CASCADE',
    },

    biometricDeviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'biometric_devices',
        key: 'deviceId',
      },
      onDelete: 'CASCADE',
    },

    biometricNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Enrollment ID / Biometric Number from device',
    },

    punchTimestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Exact timestamp when punch was recorded',
    },

    punchDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date part extracted for easier querying/indexing',
    },

    punchType: {
      type: DataTypes.ENUM('IN', 'OUT', 'Unknown'),
      allowNull: false,
      defaultValue: 'Unknown',
      comment: 'IN/OUT - usually calculated based on time/rules',
    },

    // Calculated / derived flags
    isLate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    isEarlyOut: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    isManual: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Manually added/edited by admin',
    },

    status: {
      type: DataTypes.ENUM('Valid', 'Invalid', 'Duplicate', 'Pending'),
      allowNull: false,
      defaultValue: 'Valid',
      comment: 'Validation status of this punch record',
    },

    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Context / Audit
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

  }, {
    tableName: 'biometric_punches',
    timestamps: true,
    paranoid: true, // soft deletes optional

    indexes: [
      {
        name: 'idx_employee_punch_date',
        fields: ['employeeId', 'punchDate'],
      },
      {
        name: 'idx_employee_timestamp',
        fields: ['employeeId', 'punchTimestamp'],
      },
      {
        name: 'idx_company_date',
        fields: ['companyId', 'punchDate'],
      },
      {
        name: 'idx_biometric_number_device',
        fields: ['biometricNumber', 'biometricDeviceId'],
      },
      {
        name: 'idx_device_timestamp',
        fields: ['biometricDeviceId', 'punchTimestamp'],
      },
      {
        name: 'idx_status',
        fields: ['status'],
      },
    ],
  });

  // Associations (clean & consistent)
  BiometricPunch.associate = (models) => {
    BiometricPunch.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee',
    });

    BiometricPunch.belongsTo(models.BiometricDevice, {
      foreignKey: 'biometricDeviceId',
      as: 'device',
    });

    BiometricPunch.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    BiometricPunch.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });
  };

  // Optional development sync
  // if (process.env.NODE_ENV === 'development') {
  //   BiometricPunch.sync({ alter: true })
  //     .then(() => console.log('BiometricPunch table synced successfully'))
  //     .catch(err => console.error('Error syncing BiometricPunch table:', err));
  // }

  return BiometricPunch;
};