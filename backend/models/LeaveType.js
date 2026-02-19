import { DataTypes } from 'sequelize';
export default (sequelize) => {
  const LeaveType = sequelize.define('LeaveType', {
    leaveTypeId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Name of the leave type (e.g. "Sick Leave", "Annual Leave")',
    },

    leaveTypeName: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: 'Legacy leave type name field kept for backward compatibility',
    },

    maxAllocationPertype: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    allowApplicationAfterDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    minWorkingDaysForLeave: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Detailed description or rules for this leave type',
    },

    isPaid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this leave type is paid',
    },

    isWithoutPay: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this leave type is without pay',
    },

    isCarryForwardEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether unused leaves of this type can be carried forward',
    },

    isCarryForward: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    countHolidaysAsLeave: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether holidays falling during this leave are counted as leave days',
    },

    includeHolidaysAsLeave: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    maxConsecutiveLeaves: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: { args: [0], msg: 'Maximum consecutive leaves cannot be negative' },
      },
      comment: 'Maximum consecutive days allowed for this leave type',
    },

    isLeaveWithoutPay: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    isPartiallyPaidLeave: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    isOptionalLeave: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    allowNegativeBalance: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    allowOverAllocation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    isCompensatory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    allowEncashment: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    isEarnedLeave: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
      type: DataTypes.STRING,
      allowNull: true,
    },

    updatedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },

  }, {
    tableName: 'leave_types',
    timestamps: true,
    hooks: {
      beforeValidate: (leaveType) => {
        if (!leaveType.name && leaveType.leaveTypeName) leaveType.name = leaveType.leaveTypeName;
        if (!leaveType.leaveTypeName && leaveType.name) leaveType.leaveTypeName = leaveType.name;

        if (typeof leaveType.isCarryForward === 'boolean') {
          leaveType.isCarryForwardEnabled = leaveType.isCarryForward;
        } else {
          leaveType.isCarryForward = Boolean(leaveType.isCarryForwardEnabled);
        }

        if (typeof leaveType.isLeaveWithoutPay === 'boolean') {
          leaveType.isWithoutPay = leaveType.isLeaveWithoutPay;
        } else {
          leaveType.isLeaveWithoutPay = Boolean(leaveType.isWithoutPay);
        }

        if (typeof leaveType.includeHolidaysAsLeave === 'boolean') {
          leaveType.countHolidaysAsLeave = leaveType.includeHolidaysAsLeave;
        } else {
          leaveType.includeHolidaysAsLeave = Boolean(leaveType.countHolidaysAsLeave);
        }
      },
    },
    validate: {
      paidLeaveCannotBeWithoutPay() {
        if (this.isPaid && this.isWithoutPay) {
          throw new Error('A paid leave type cannot also be marked as "Leave Without Pay".');
        }
      },
    },
  });

  LeaveType.associate = (models) => {
    LeaveType.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    LeaveType.hasMany(models.LeavePolicy, { foreignKey: 'leaveTypeId', as: 'leavePolicies' });
    LeaveType.hasMany(models.LeaveAllocation, { foreignKey: 'leaveTypeId', as: 'allocations' });
    LeaveType.hasMany(models.LeaveRequest, { foreignKey: 'leaveTypeId', as: 'requests' });
  };

  // if (process.env.NODE_ENV === 'development') {
  //   LeaveType.sync({ alter: true })
  //     .then(() => console.log('LeaveType table synced successfully'))
  //     .catch(err => console.error('Error syncing LeaveType table:', err));
  // }

  return LeaveType;
};
