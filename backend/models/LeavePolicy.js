import { DataTypes } from 'sequelize';
export default (sequelize) => {
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

    leaveTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'leave_types',
        key: 'leaveTypeId',
      },
      onDelete: 'CASCADE',
      comment: 'Foreign key to leave type',
    },

    accrualFrequency: {
      type: DataTypes.ENUM('Monthly', 'Quarterly', 'Yearly', 'On Joining'),
      allowNull: false,
      defaultValue: 'Yearly',
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
        fields: ['companyId', 'leaveTypeId'],
        name: 'idx_policy_company_leave_type',
      },
      {
        unique: true,
        fields: ['companyId', 'name'],
        name: 'uq_policy_company_name',
      },
    ],
  });

  LeavePolicy.associate = (models) => {
    LeavePolicy.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    LeavePolicy.belongsTo(models.LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });
    LeavePolicy.hasMany(models.LeaveAllocation, { foreignKey: 'leavePolicyId', as: 'allocations' });
  };

  // if (process.env.NODE_ENV === 'development') {
  //   LeavePolicy.sync({ alter: true })
  //     .then(() => console.log('LeavePolicy table synced successfully'))
  //     .catch(err => console.error('Error syncing LeavePolicy table:', err));
  // }

  return LeavePolicy;
};
