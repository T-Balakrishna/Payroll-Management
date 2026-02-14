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

    countHolidaysAsLeave: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether holidays falling during this leave are counted as leave days',
    },

    maxConsecutiveLeaves: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: { args: [0], msg: 'Maximum consecutive leaves cannot be negative' },
      },
      comment: 'Maximum consecutive days allowed for this leave type',
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

  }, {
    tableName: 'leave_types',
    timestamps: true,
    validate: {
      paidLeaveCannotBeWithoutPay() {
        if (this.isPaid && this.isWithoutPay) {
          throw new Error('A paid leave type cannot also be marked as "Leave Without Pay".');
        }
      },
    },
  });

  LeaveType.associate = (models) => {
    LeaveType.belongsTo(models.Company, { foreignKey: 'companyId' });
    LeaveType.hasMany(models.LeavePolicy, { foreignKey: 'leaveTypeId' });
    LeaveType.hasMany(models.LeaveAllocation, { foreignKey: 'leaveTypeId' });
    LeaveType.hasMany(models.LeaveRequest, { foreignKey: 'leaveTypeId' });
  };

  // if (process.env.NODE_ENV === 'development') {
  //   LeaveType.sync({ alter: true })
  //     .then(() => console.log('LeaveType table synced successfully'))
  //     .catch(err => console.error('Error syncing LeaveType table:', err));
  // }

  return LeaveType;
};