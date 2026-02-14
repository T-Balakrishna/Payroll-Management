import { DataTypes } from 'sequelize';
export default (sequelize) => {
  const SalaryComponent = sequelize.define('SalaryComponent', {
    salaryComponentId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Name of the salary component (e.g. "Basic Pay", "House Rent Allowance", "Professional Tax")',
    },

    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Unique short code for this component (e.g. "BASIC", "HRA", "PF", "PT")',
    },

    type: {
      type: DataTypes.ENUM('Earning', 'Deduction'),
      allowNull: false,
      comment: 'Whether this is an earning or deduction component',
    },

    calculationType: {
      type: DataTypes.ENUM('Fixed', 'Percentage', 'Formula'),
      allowNull: false,
      defaultValue: 'Fixed',
      comment: 'How the amount is calculated',
    },

    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Percentage value when calculationType is Percentage (e.g. 12 for 12%)',
    },

    formula: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mathematical expression when calculationType is Formula (e.g. "BASIC * 0.12" or "(BASIC + DA) * 0.10")',
    },

    affectsGrossSalary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this component contributes to gross salary',
    },

    affectsNetSalary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this component affects take-home/net salary',
    },

    isTaxable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this component is subject to income tax',
    },

    isStatutory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this is a mandatory/statutory component (e.g. PF, ESI, PT)',
    },

    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Order in which this component appears in payslip',
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
      comment: 'User who created this salary component',
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
      comment: 'User who last updated this salary component',
    },

  }, {
    tableName: 'salary_components',  // ← exact model name as table name
    timestamps: true,
    paranoid: true,

    indexes: [
      {
        unique: true,
        fields: ['code', 'companyId'],
        name: 'unique_code_per_company',
      },
      {
        fields: ['companyId', 'status'],
        name: 'idx_company_status',
      },
    ],
  });

  // Associations
  SalaryComponent.associate = (models) => {
    SalaryComponent.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    SalaryComponent.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });

    SalaryComponent.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
    });

    SalaryComponent.hasMany(models.Formula, {
      foreignKey: 'targetComponentId',
      as: 'formulas',
    });

    SalaryComponent.hasMany(models.EmployeeSalaryComponent, {
      foreignKey: 'salaryComponentId',
      as: 'employeeSalaryComponents',
    });
  };

  // Optional development sync
  // if (process.env.NODE_ENV === 'development') {
  //   SalaryComponent.sync({ alter: true })
  //     .then(() => console.log('SalaryComponent table synced successfully'))
  //     .catch(err => console.error('Error syncing SalaryComponent table:', err));
  // }

  return SalaryComponent;
};
