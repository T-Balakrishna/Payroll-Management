import { DataTypes } from 'sequelize';
export default (sequelize) => {
  const BiometricDevice = sequelize.define('BiometricDevice', {
    deviceId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Device name / friendly name (e.g. "Main Gate Biometric")',
    },

    deviceIp: {
      type: DataTypes.STRING(45),  // Supports IPv4 & IPv6
      allowNull: false,
      unique: true,
      comment: 'IP address of the biometric device',
    },

    location: {
      type: DataTypes.STRING(150),
      allowNull: false,
      comment: 'Physical location / branch / floor / department',
    },

    status: {
      type: DataTypes.ENUM('Active', 'Inactive', 'Maintenance', 'Offline'),
      allowNull: false,
      defaultValue: 'Active',
      comment: 'Current operational status of the device',
    },

    isAutoSyncEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Enable/disable automatic attendance sync (e.g. every 5–15 minutes)',
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
    tableName: 'biometric_devices',
    timestamps: true,
    paranoid: true, // Soft delete support (optional but recommended)

    indexes: [
      {
        fields: ['companyId', 'deviceIp'],
        unique: true,
        name: 'unique_company_device_ip',
      },
      {
        fields: ['status'],
        name: 'idx_device_status',
      },
      {
        fields: ['companyId', 'status'],
        name: 'idx_company_status',
      },
    ],
  });

  // Associations (clean & consistent)
  BiometricDevice.associate = (models) => {
    BiometricDevice.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    BiometricDevice.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });

    BiometricDevice.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
    });

    // Recommended: Link to enrolled employees
    BiometricDevice.hasMany(models.Employee, {
      foreignKey: 'biometricDeviceId',
      as: 'enrolledEmployees',
    });
  };

  // Optional: Development-only table sync
  // if (process.env.NODE_ENV === 'development') {
  //   BiometricDevice.sync({ alter: true })
  //     .then(() => console.log('BiometricDevice table synced successfully'))
  //     .catch(err => console.error('Error syncing BiometricDevice table:', err));
  // }

  return BiometricDevice;
};