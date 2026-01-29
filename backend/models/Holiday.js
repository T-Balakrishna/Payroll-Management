const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Holiday = sequelize.define('Holiday', {
    holidayId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    holidayDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date of the holiday or week off',
    },

    description: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Name/description of the holiday (e.g. "Republic Day", "Diwali")',
    },

    type: {
      type: DataTypes.ENUM('Holiday', 'Week Off', 'Optional Holiday'),
      allowNull: false,
      defaultValue: 'Holiday',
      comment: 'Type of day: mandatory holiday or weekly off',
    },

    holidayPlanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'holiday_plans',
        key: 'holidayPlanId',
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

    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      allowNull: false,
      defaultValue: 'Active',
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
    tableName: 'holidays',
    timestamps: true,
    paranoid: true,

    indexes: [
      {
        unique: true,
        fields: ['holidayPlanId', 'holidayDate'],
        name: 'unique_plan_date'
      },
      {
        fields: ['companyId', 'holidayDate'],
        name: 'idx_company_holiday_date'
      }
    ],

    validate: {
      async dateWithinPlanRange() {
        const plan = await sequelize.models.HolidayPlan.findByPk(this.holidayPlanId);
        if (!plan) {
          throw new Error('Associated holiday plan not found');
        }

        const holidayDate = new Date(this.holidayDate);
        const planStart = new Date(plan.startDate);
        const planEnd = new Date(plan.endDate);

        if (holidayDate < planStart || holidayDate > planEnd) {
          throw new Error(
            `Holiday date (${this.holidayDate}) must be within the plan period (${plan.startDate} to ${plan.endDate})`
          );
        }
      }
    }
  });

  Holiday.associate = (models) => {
    Holiday.belongsTo(models.HolidayPlan, {
      foreignKey: 'holidayPlanId',
      as: 'plan'
    });

    Holiday.belongsTo(models.Company, {
      foreignKey: 'companyId'
    });

    Holiday.belongsTo(models.User, { as: 'Creator', foreignKey: 'createdBy' });
    Holiday.belongsTo(models.User, { as: 'Updater', foreignKey: 'updatedBy' });
  };

  // if (process.env.NODE_ENV === 'development') {
  //   Holiday.sync({ alter: true })
  //     .then(() => console.log('Holiday table synced successfully'))
  //     .catch(err => console.error('Error syncing Holiday table:', err));
  // }

  return Holiday;
};