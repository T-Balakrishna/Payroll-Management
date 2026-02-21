import { DataTypes } from 'sequelize';
export default (sequelize) => {
  const WEEKLY_OFF_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const DEFAULT_WEEKLY_OFF = ['sunday'];

  const normalizeWeeklyOffValue = (value) => {
    if (value == null) return [...DEFAULT_WEEKLY_OFF];

    let parsed = value;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        parsed = [];
      }
    }

    if (Array.isArray(parsed)) {
      const unique = new Set(
        parsed
          .map((day) => String(day || '').trim().toLowerCase())
          .filter((day) => WEEKLY_OFF_DAYS.includes(day))
      );
      return [...unique];
    }

    if (typeof parsed === 'object' && parsed) {
      return WEEKLY_OFF_DAYS.filter((day) => Boolean(parsed[day]));
    }

    return [];
  };

  const ShiftType = sequelize.define('ShiftType', {
    shiftTypeId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Shift name (e.g. "General Shift", "Night Shift", "Morning Shift")',
    },

    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: 'Shift start time (e.g. "09:00:00")',
    },

    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: 'Shift end time (e.g. "18:00:00")',
    },

    beginCheckInBefore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Minutes before shift start to allow check-in',
      validate: {
        isInt: true,
        min: { args: [0], msg: 'Begin check-in before must be at least 0 minutes.' },
      },
    },

    allowCheckOutAfter: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Minutes after shift end to allow check-out',
      validate: {
        isInt: true,
        min: { args: [0], msg: 'Allow check-out after must be at least 0 minutes.' },
      },
    },

    enableAutoAttendance: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Automatically mark attendance if no manual punch',
    },

    requireCheckIn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    requireCheckOut: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    allowMultipleCheckIns: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Allow multiple check-ins/out per day',
    },

    autoMarkAbsentIfNoCheckIn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Auto-mark absent if no check-in recorded',
    },

    workingHoursCalculation: {
      type: DataTypes.ENUM('first_to_last', 'fixed_hours', 'with_breaks'),
      allowNull: false,
      defaultValue: 'first_to_last',
      comment: 'Method to calculate working hours',
    },

    minimumHours: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 6.00,
      comment: 'Minimum working hours required to mark present',
      validate: {
        min: { args: [0], msg: 'Minimum hours must be greater than or equal to 0.' },
      },
    },

    halfDayHours: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 4.00,
      comment: 'Working hours threshold for half day',
      validate: {
        min: { args: [0], msg: 'Half day hours must be greater than 0.' },
      },
    },

    absentHours: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 6.00,
      comment: 'Working hours threshold to mark absent',
      validate: {
        min: { args: [0], msg: 'Absent hours must be greater than 0.' },
      },
    },

    enableLateEntry: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    lateGracePeriod: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Grace period in minutes for late entry',
      validate: {
        isInt: true,
        min: { args: [0], msg: 'Late grace period must be at least 0 minutes.' },
      },
    },

    enableEarlyExit: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    earlyExitPeriod: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Period in minutes for early exit allowance',
      validate: {
        isInt: true,
        min: { args: [0], msg: 'Early exit period must be at least 0 minutes.' },
      },
    },
    markAutoAttendanceOnHolidays: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Auto-mark attendance on holidays',
    },
    weeklyOff: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: JSON.stringify(DEFAULT_WEEKLY_OFF),
      get() {
        const raw = this.getDataValue('weeklyOff');
        return normalizeWeeklyOffValue(raw);
      },
      set(value) {
        const normalized = normalizeWeeklyOffValue(value);
        this.setDataValue('weeklyOff', JSON.stringify(normalized));
      },
      validate: {
        isValidWeeklyOff(value) {
          const normalized = normalizeWeeklyOffValue(value);
          if (normalized.length === 0) {
            throw new Error('Select at least one weekly off day.');
          }
          const hasInvalid = normalized.some((day) => !WEEKLY_OFF_DAYS.includes(day));
          if (hasInvalid) {
            throw new Error('Weekly off contains invalid day values.');
          }
        },
      },
      comment: 'JSON array of weekly off day names (e.g. ["sunday", "saturday"])',
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
      comment: 'User who created this shift type',
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
      comment: 'User who last updated this shift type',
    },

  }, {
    tableName: 'shift_types',  // ← exact model name as table name
    timestamps: true,
    paranoid: true,

    indexes: [
      {
        fields: ['companyId', 'status'],
        name: 'idx_company_status',
      },
    ],

    validate: {
      validateTimeRange() {
        // Allow overnight shifts (no strict validation needed)
      },
      validateHalfDayThreshold() {
        if (this.halfDayHours >= this.absentHours) {
          throw new Error('Half day hours must be less than absent hours threshold.');
        }
      },
      validateMinimumHours() {
        if (this.minimumHours < this.halfDayHours) {
          throw new Error('Minimum hours must be greater than or equal to half day hours.');
        }
      },
      validateCheckInRequirements() {
        if (this.autoMarkAbsentIfNoCheckIn && !this.requireCheckIn) {
          throw new Error('Cannot auto-mark absent if check-in is not required.');
        }
      },
    },
  });

  // Associations
  ShiftType.associate = (models) => {
    ShiftType.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    ShiftType.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });

    ShiftType.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
    });

    ShiftType.hasMany(models.ShiftAssignment, {
      foreignKey: 'shiftTypeId',
      as: 'shiftAssignments',
    });

    ShiftType.hasMany(models.Attendance, {
      foreignKey: 'shiftTypeId',
      as: 'attendances',
    });
  };

  // Optional development sync
  // if (process.env.NODE_ENV === 'development') {
  //   ShiftType.sync({ alter: true })
  //     .then(() => console.log('ShiftType table synced successfully'))
  //     .catch(err => console.error('Error syncing ShiftType table:', err));
  // }

  return ShiftType;
};
