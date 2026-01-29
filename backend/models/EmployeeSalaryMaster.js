const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmployeeSalaryMaster = sequelize.define('EmployeeSalaryMaster', {
    employeeSalaryMasterId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Employee',
        key: 'employeeId',
      },
      onDelete: 'CASCADE',
    },

    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Company',
        key: 'companyId',
      },
      onDelete: 'CASCADE',
    },

    // Salary Period
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date from which this salary structure is effective',
    },

    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date until which this salary structure is effective (NULL = current)',
    },

    // High-level Salary Info
    basicSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      comment: 'Basic salary component',
    },

    grossSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      comment: 'Total of all earnings',
    },

    totalDeductions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total monthly deductions',
    },

    netSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      comment: 'Take home = Gross - Deductions',
    },

    ctcAnnual: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      comment: 'Annual Cost to Company',
    },

    ctcMonthly: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      comment: 'Monthly CTC',
    },

    // Revision Info
    revisionType: {
      type: DataTypes.ENUM('Initial', 'Annual_Hike', 'Promotion', 'Special_Increment', 'Correction', 'Transfer'),
      allowNull: false,
      defaultValue: 'Initial',
      comment: 'Type of salary revision',
    },

    revisionPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Hike percentage (e.g., 10.50 for 10.5%)',
    },

    previousSalaryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Reference to previous salary structure (self-reference)',
      references: {
        model: 'EmployeeSalaryMaster',
        key: 'employeeSalaryMasterId',
      },
      onDelete: 'SET NULL',
    },

    // Status
    status: {
      type: DataTypes.ENUM('Draft', 'Active', 'Superseded', 'Cancelled'),
      allowNull: false,
      defaultValue: 'Active',
      comment: 'Active = current salary, Superseded = replaced by new revision',
    },

    // Metadata
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Audit fields – now using correct user PK
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'User',
        key: 'userId',
      },
      onDelete: 'SET NULL',
      comment: 'User who created this salary record',
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'User',
        key: 'userId',
      },
      onDelete: 'SET NULL',
      comment: 'User who last updated this salary record',
    },

    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'User',
        key: 'userId',
      },
      onDelete: 'SET NULL',
      comment: 'User who approved this salary revision',
    },

    approvedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },

  }, {
    tableName: 'employee_salary_masters',
    timestamps: true,
    paranoid: true,

    indexes: [
      {
        fields: ['employeeId', 'effectiveFrom'],
        name: 'idx_employee_effective_from',
      },
      {
        fields: ['employeeId', 'status'],
        name: 'idx_employee_status',
      },
      {
        fields: ['companyId', 'effectiveFrom'],
        name: 'idx_company_effective_from',
      },
    ],

    validate: {
      effectiveDateRange() {
        if (this.effectiveTo && this.effectiveFrom > this.effectiveTo) {
          throw new Error('effectiveFrom must be before effectiveTo');
        }
      },
    },
  });

  // Associations (add these if not already in your associations file)
  EmployeeSalaryMaster.associate = (models) => {
    EmployeeSalaryMaster.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      targetKey: 'employeeId',
      as: 'employee',
    });

    EmployeeSalaryMaster.belongsTo(models.Company, {
      foreignKey: 'companyId',
      targetKey: 'companyId',
      as: 'company',
    });

    EmployeeSalaryMaster.belongsTo(models.EmployeeSalaryMaster, {
      foreignKey: 'previousSalaryId',
      targetKey: 'employeeSalaryMasterId',
      as: 'previousSalary',
    });

    EmployeeSalaryMaster.belongsTo(models.User, {
      foreignKey: 'createdBy',
      targetKey: 'userId',
      as: 'creator',
    });

    EmployeeSalaryMaster.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      targetKey: 'userId',
      as: 'updater',
    });

    EmployeeSalaryMaster.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      targetKey: 'userId',
      as: 'approver',
    });

    EmployeeSalaryMaster.hasMany(models.SalaryGeneration, {
      foreignKey: 'employeeSalaryMasterId',
      targetKey: 'employeeSalaryMasterId',
      as: 'salaryGenerations',
    });

    EmployeeSalaryMaster.hasMany(models.EmployeeSalaryComponent, {
      foreignKey: 'employeeSalaryMasterId',
      targetKey: 'employeeSalaryMasterId',
      as: 'components',
    });
  };

  // Optional development sync
  // if (process.env.NODE_ENV === 'development') {
  //   EmployeeSalaryMaster.sync({ alter: true })
  //     .then(() => console.log('EmployeeSalaryMaster table synced successfully'))
  //     .catch(err => console.error('Error syncing EmployeeSalaryMaster table:', err));
  // }

  return EmployeeSalaryMaster;
};