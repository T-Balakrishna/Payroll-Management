const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LeavePolicy = sequelize.define('LeavePolicy', {
    leavePolicyId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Policy name (e.g. "Annual Leave Policy - Permanent Staff")',
    },

    leaveType: {
      type: DataTypes.ENUM(
        'Sick Leave',
        'Annual Leave',
        'Maternity Leave',
        'Paternity Leave',
        'Casual Leave',
        'Compensatory Off'
      ),
      allowNull: false,
      comment: 'The type of leave this policy applies to',
    },


    accrualFrequency: {
      type: DataTypes.ENUM('Monthly', 'Quarterly', 'Yearly', 'On Joining'),
      allowNull: false,
      defaultValue: 'Yearly',
    },

    accrualDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of leaves accrued per frequency period',
    },

    maxCarryForward: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Maximum leaves that can be carried forward to next period',
    },

    allowEncashment: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    encashmentRules: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Rules or formula for encashment (free text or JSON)',
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

  }, {
    tableName: 'leave_policies',
    timestamps: true,
    indexes: [
      {
        fields: ['companyId', 'leaveType'],
        name: 'idx_company_leave_type',
      },
    ],
  });

  LeavePolicy.associate = (models) => {
    LeavePolicy.belongsTo(models.Company, { foreignKey: 'companyId' });
    LeavePolicy.hasMany(models.LeaveAllocation, { foreignKey: 'leavePolicyId' });
  };

  // if (process.env.NODE_ENV === 'development') {
  //   LeavePolicy.sync({ alter: true })
  //     .then(() => console.log('LeavePolicy table synced successfully'))
  //     .catch(err => console.error('Error syncing LeavePolicy table:', err));
  // }

  return LeavePolicy;
};