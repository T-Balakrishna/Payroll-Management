import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Permission = sequelize.define('Permission', {
    permissionId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'staff_details',
        key: 'staffId',
      },
      onDelete: 'CASCADE',
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

    attendanceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'attendance',
        key: 'attendanceId',
      },
      onDelete: 'SET NULL',
    },

    permissionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    permissionHours: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 0.00,
    },

    permissionStartTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },

    permissionEndTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'permissions',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['companyId', 'permissionDate'], name: 'idx_permission_company_date' },
      { fields: ['staffId', 'permissionDate'], name: 'idx_permission_staff_date' },
    ],
  });

  Permission.associate = (models) => {
    Permission.belongsTo(models.Employee, { foreignKey: 'staffId', as: 'employee' });
    Permission.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    Permission.belongsTo(models.Attendance, { foreignKey: 'attendanceId', as: 'attendance' });
    Permission.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Permission.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return Permission;
};
