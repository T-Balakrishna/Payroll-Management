const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SalaryGeneration = sequelize.define('SalaryGeneration', {
    salaryGenerationId: {
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

    employeeSalaryMasterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employee_salary_masters',
        key: 'employeeSalaryMasterId',
      },
      onDelete: 'RESTRICT',
      comment: 'Reference to the salary structure used for this generation',
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

    salaryMonth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 12,
      },
      comment: 'Month number (1-12)',
    },

    salaryYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Year (e.g. 2025)',
    },

    payPeriodStart: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Start date of the pay period',
    },

    payPeriodEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'End date of the pay period',
    },

    workingDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total working days in the pay period',
    },

    presentDays: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Days present (includes half days as 0.5)',
    },

    absentDays: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Days absent',
    },

    paidLeaveDays: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Paid leave days taken',
    },

    unpaidLeaveDays: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Unpaid leave days taken',
    },

    holidayDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Public holidays in the period',
    },

    weekOffDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Week offs in the period',
    },

    overtimeHours: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total overtime hours',
    },

    lateCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of late arrivals',
    },

    earlyExitCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of early exits',
    },

    basicSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Basic salary component',
    },

    totalEarnings: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Sum of all earning components',
    },

    totalDeductions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Sum of all deduction components',
    },

    grossSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total earnings before deductions',
    },

    netSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Final take-home salary (gross - deductions)',
    },

    overtimePay: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Additional pay for overtime',
    },

    lateDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Deduction for late arrivals',
    },

    absentDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Deduction for absences',
    },

    leaveDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Deduction for unpaid leaves',
    },

    bonus: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Any bonus amount',
    },

    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes or remarks',
    },

    status: {
      type: DataTypes.ENUM('Draft', 'Generated', 'Approved', 'Paid', 'Cancelled'),
      allowNull: false,
      defaultValue: 'Draft',
      comment: 'Salary generation status',
    },

    generatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
    },

    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
    },

    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    paidBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
    },

    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    paymentMethod: {
      type: DataTypes.ENUM('Bank Transfer', 'Cash', 'Cheque', 'UPI', 'Other'),
      allowNull: true,
      comment: 'Method of salary payment',
    },

    paymentReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Transaction ID or reference number',
    },

  }, {
    tableName: 'salary_generations',          // ← exact model name as table name
    timestamps: true,
    paranoid: true,

    indexes: [
      {
        unique: true,
        fields: ['staffId', 'salaryMonth', 'salaryYear'],
        name: 'unique_employee_month_year',
      },
      {
        fields: ['companyId', 'salaryMonth', 'salaryYear'],
        name: 'idx_company_month_year',
      },
      {
        fields: ['status'],
        name: 'idx_salary_status',
      },
    ],

    validate: {
      checkPeriodDates() {
        if (this.payPeriodStart && this.payPeriodEnd) {
          if (new Date(this.payPeriodStart) > new Date(this.payPeriodEnd)) {
            throw new Error('Pay period start date must be before end date');
          }
        }
      },
    },
  });

  // Associations
  SalaryGeneration.associate = (models) => {
    SalaryGeneration.belongsTo(models.Employee, {
      foreignKey: 'staffId',
      as: 'employee',
    });

    SalaryGeneration.belongsTo(models.EmployeeSalaryMaster, {
      foreignKey: 'employeeSalaryMasterId',
      as: 'employeeSalaryMaster',
    });

    SalaryGeneration.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    SalaryGeneration.belongsTo(models.User, {
      foreignKey: 'generatedBy',
      as: 'generator',
    });

    SalaryGeneration.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approver',
    });

    SalaryGeneration.belongsTo(models.User, {
      foreignKey: 'paidBy',
      as: 'payer',
    });

    SalaryGeneration.hasMany(models.SalaryGenerationDetail, {
      foreignKey: 'salaryGenerationId',
      as: 'salaryGenerationDetails',
    });
  };

  // Optional development sync
  // if (process.env.NODE_ENV === 'development') {
  //   SalaryGeneration.sync({ alter: true })
  //     .then(() => console.log('SalaryGeneration table synced successfully'))
  //     .catch(err => console.error('Error syncing SalaryGeneration table:', err));
  // }

  return SalaryGeneration;
};
