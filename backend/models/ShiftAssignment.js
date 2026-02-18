import { DataTypes } from 'sequelize';
export default (sequelize) => {
  const ShiftAssignment = sequelize.define('ShiftAssignment', {
    shiftAssignmentId: {
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

    shiftTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'shift_types',
        key: 'shiftTypeId',
      },
      onDelete: 'CASCADE',
    },

    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Start date for recurring shift assignments',
    },

    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'End date for recurring shift assignments',
    },

    isRecurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this assignment repeats over time',
    },

    recurringPattern: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'custom'),
      allowNull: true,
      comment: 'Recurrence frequency pattern',
    },

    recurringDays: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Days of week for weekly pattern: [0,1,2,3,4,5,6] where 0=Sunday',
    },

    status: {
      type: DataTypes.ENUM('Active', 'Inactive', 'Cancelled'),
      allowNull: false,
      defaultValue: 'Active',
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes or instructions for this shift assignment',
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
      comment: 'User who created this shift assignment',
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
      comment: 'User who last updated this shift assignment',
    },

  }, {
    tableName: 'shift_assignments',  // ← exact model name as table name
    timestamps: true,
    paranoid: true,

    indexes: [
      {
        unique: true,
        fields: ['staffId'],
        name: 'unique_employee_shift_assignment',
      },
      {
        fields: ['companyId', 'status'],
        name: 'idx_company_status',
      },
      {
        fields: ['shiftTypeId'],
        name: 'idx_shift_type',
      },
      {
        fields: ['staffId', 'status'],
        name: 'idx_employee_status',
      },
    ],

    validate: {
      validateDateRange() {
        if (this.startDate && this.endDate) {
          if (new Date(this.startDate) > new Date(this.endDate)) {
            throw new Error('Start date must be before or equal to end date.');
          }
        }
      },
      validateRecurringData() {
        if (this.isRecurring) {
          if (!this.startDate || !this.endDate) {
            throw new Error('Recurring assignments must have start and end dates.');
          }
          if (!this.recurringPattern) {
            throw new Error('Recurring assignments must have a pattern.');
          }
        }
      },
    },
  });

  // Associations
  ShiftAssignment.associate = (models) => {
    ShiftAssignment.belongsTo(models.Employee, {
      foreignKey: 'staffId',
      as: 'employee',
    });

    ShiftAssignment.belongsTo(models.ShiftType, {
      foreignKey: 'shiftTypeId',
      as: 'shiftType',
    });

    ShiftAssignment.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    ShiftAssignment.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });

    ShiftAssignment.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
    });

    ShiftAssignment.hasMany(models.Attendance, {
      foreignKey: 'shiftAssignmentId',
      as: 'attendances',
    });
  };

  // Optional development sync
  // if (process.env.NODE_ENV === 'development') {
  //   ShiftAssignment.sync({ alter: true })
  //     .then(() => console.log('ShiftAssignment table synced successfully'))
  //     .catch(err => console.error('Error syncing ShiftAssignment table:', err));
  // }

  return ShiftAssignment;
};
