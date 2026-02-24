import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const SalaryComponent = sequelize.define(
    'SalaryComponent',
    {
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

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional description shown in salary setup screens',
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

      percentageBase: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Base component code when calculationType is Percentage (e.g. BASIC, GROSS)',
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
    },
    {
      tableName: 'salary_components',
      timestamps: true,
      paranoid: true,
      indexes: [
        {
          unique: true,
          fields: ['code', 'companyId'],
          name: 'unique_code_per_company',
        },
        {
          unique: true,
          fields: ['name', 'companyId'],
          name: 'unique_name_per_company',
        },
        {
          fields: ['companyId', 'status'],
          name: 'idx_company_status',
        },
      ],
      validate: {
        validateCalculationConfig() {
          const hasText = (value) => String(value || '').trim().length > 0;

          if (this.calculationType === 'Percentage') {
            throw new Error('Percentage calculation is no longer supported');
          }

          if (this.type === 'Earning') {
            if (this.calculationType !== 'Fixed') {
              throw new Error('Earning components must use Fixed calculation type');
            }
            if (hasText(this.formula)) {
              throw new Error('Earning components cannot have a formula');
            }
          }

          if (this.type === 'Deduction') {
            if (this.calculationType !== 'Formula') {
              throw new Error('Deduction components must use Formula calculation type');
            }
            if (!hasText(this.formula)) {
              throw new Error('formula is required for Deduction components');
            }
          }
        },
      },
    }
  );

  const normalizeNullableText = (value) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  };

  SalaryComponent.addHook('beforeValidate', (instance) => {
    instance.name = String(instance.name || '').trim();
    instance.code = String(instance.code || '').trim().toUpperCase();
    instance.description = normalizeNullableText(instance.description);
    instance.formula = normalizeNullableText(instance.formula);
    instance.percentageBase = normalizeNullableText(instance.percentageBase)?.toUpperCase() || null;

    if (instance.type === 'Earning') {
      instance.calculationType = 'Fixed';
      instance.formula = null;
    } else if (instance.type === 'Deduction') {
      instance.calculationType = 'Formula';
    }

    if (instance.calculationType !== 'Percentage') {
      instance.percentage = null;
      instance.percentageBase = null;
    }
    if (instance.calculationType !== 'Formula') {
      instance.formula = null;
    }
  });

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

  return SalaryComponent;
};
