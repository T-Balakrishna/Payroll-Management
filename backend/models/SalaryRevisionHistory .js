const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SalaryRevisionHistory = sequelize.define('SalaryRevisionHistory', {
    salaryRevisionHistoryId: {
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

    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'companyId',
      },
      onDelete: 'CASCADE',
    },

    oldSalaryMasterId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Previous salary structure (null for initial assignment)',
      references: {
        model: 'employee_salary_masters',
        key: 'employeeSalaryMasterId',
      },
      onDelete: 'SET NULL',
    },

    newSalaryMasterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'New salary structure',
      references: {
        model: 'employee_salary_masters',
        key: 'employeeSalaryMasterId',
      },
      onDelete: 'CASCADE',
    },

    revisionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date when this revision becomes effective',
    },

    revisionType: {
      type: DataTypes.ENUM('Initial', 'Annual_Hike', 'Promotion', 'Special_Increment', 'Correction', 'Transfer'),
      allowNull: false,
    },

    // Comparison Data
    oldBasicSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      comment: 'Previous basic salary',
    },

    newBasicSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      comment: 'New basic salary',
    },

    oldGrossSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      comment: 'Previous gross salary',
    },

    newGrossSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      comment: 'New gross salary',
    },

    oldCTC: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      comment: 'Previous annual CTC',
    },

    newCTC: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      comment: 'New annual CTC',
    },

    incrementAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      comment: 'Absolute increment amount',
    },

    incrementPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      comment: 'Percentage increase',
    },

    // Metadata
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for this salary revision',
    },

    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
      comment: 'User who approved this revision',
    },

    approvedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    processedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
      comment: 'User who processed/recorded this revision',
    },

    // Audit fields (added for consistency)
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
      comment: 'User who created this history record',
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
      comment: 'User who last updated this history record',
    },

  }, {
    tableName: 'salary_revision_histories',  // ← exact model name as table name
    timestamps: true,
    paranoid: true,

    indexes: [
      {
        fields: ['staffId', 'revisionDate'],
        name: 'idx_employee_revision_date',
      },
      {
        fields: ['revisionType'],
        name: 'idx_revision_type',
      },
      {
        fields: ['companyId'],
        name: 'idx_company',
      },
      {
        fields: ['staffId', 'newSalaryMasterId'],
        unique: true,
        name: 'unique_employee_new_structure',
      },
    ],
  });

  // Associations
  SalaryRevisionHistory.associate = (models) => {
    SalaryRevisionHistory.belongsTo(models.Employee, {
      foreignKey: 'staffId',
      as: 'employee',
    });

    SalaryRevisionHistory.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    SalaryRevisionHistory.belongsTo(models.EmployeeSalaryMaster, {
      foreignKey: 'oldSalaryMasterId',
      as: 'oldSalaryMaster',
    });

    SalaryRevisionHistory.belongsTo(models.EmployeeSalaryMaster, {
      foreignKey: 'newSalaryMasterId',
      as: 'newSalaryMaster',
    });

    SalaryRevisionHistory.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approver',
    });

    SalaryRevisionHistory.belongsTo(models.User, {
      foreignKey: 'processedBy',
      as: 'processor',
    });

    SalaryRevisionHistory.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });

    SalaryRevisionHistory.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
    });
  };

  // Optional development sync
  // if (process.env.NODE_ENV === 'development') {
  //   SalaryRevisionHistory.sync({ alter: true })
  //     .then(() => console.log('SalaryRevisionHistory table synced successfully'))
  //     .catch(err => console.error('Error syncing SalaryRevisionHistory table:', err));
  // }

  return SalaryRevisionHistory;
};
