import { DataTypes } from 'sequelize';
export default (sequelize) => {
  const HolidayPlan = sequelize.define('HolidayPlan', {
    holidayPlanId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    holidayPlanName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Name of the holiday plan/year (e.g. "2025 Company Holidays")',
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
    tableName: 'holiday_plans',
    timestamps: true,
    paranoid: true,

    validate: {
      datesAreValid() {
        if (this.startDate >= this.endDate) {
          throw new Error('End date must be after start date');
        }
      }
    },

    indexes: [
      {
        fields: ['companyId', 'startDate', 'endDate'],
        name: 'idx_company_holiday_period'
      },
      {
        fields: ['status'],
        name: 'idx_holiday_plan_status'
      }
    ]
  });

  HolidayPlan.associate = (models) => {
    HolidayPlan.belongsTo(models.Company, { foreignKey: 'companyId' });

    HolidayPlan.belongsTo(models.User, { as: 'Creator', foreignKey: 'createdBy' });
    HolidayPlan.belongsTo(models.User, { as: 'Updater', foreignKey: 'updatedBy' });

    // Added this missing reverse association (very useful)
    HolidayPlan.hasMany(models.Holiday, { foreignKey: 'holidayPlanId', as: 'holidays' });
  };

  // if (process.env.NODE_ENV === 'development') {
  //   HolidayPlan.sync({ alter: true })
  //     .then(() => console.log('HolidayPlan table synced successfully'))
  //     .catch(err => console.error('Error syncing HolidayPlan table:', err));
  // }

  return HolidayPlan;
};
