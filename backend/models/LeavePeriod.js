import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const LeavePeriod = sequelize.define('LeavePeriod', {
    leavePeriodId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      allowNull: false,
      defaultValue: 'Active',
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
    tableName: 'leave_periods',
    timestamps: true,
    indexes: [
      { fields: ['companyId', 'status'], name: 'idx_leave_period_company_status' },
      { fields: ['companyId', 'startDate', 'endDate'], name: 'idx_leave_period_company_dates' },
    ],
    validate: {
      datesAreValid() {
        if (!this.startDate || !this.endDate) return;
        if (this.startDate >= this.endDate) {
          throw new Error('End date must be after the start date.');
        }
      },
    },
  });

  LeavePeriod.associate = (models) => {
    LeavePeriod.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    LeavePeriod.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    LeavePeriod.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
  };

  return LeavePeriod;
};
