const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Formula = sequelize.define('Formula', {
    formulaId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Formula name for identification (e.g. "Basic + HRA Allowance")',
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of what this formula calculates',
    },

    formulaType: {
      type: DataTypes.ENUM('Simple', 'Conditional', 'Complex'),
      allowNull: false,
      defaultValue: 'Simple',
      comment: 'Type of formula structure',
    },

    formulaExpression: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'The actual formula expression (e.g., BASIC + HRA * 0.5)',
    },

    formulaJson: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON structure of formula for visual builder',
      /* Example structure:
      {
        "type": "expression",
        "operator": "+",
        "left": { "type": "component", "code": "BASIC" },
        "right": {
          "type": "expression",
          "operator": "*",
          "left": { "type": "component", "code": "HRA" },
          "right": { "type": "number", "value": 0.5 }
        }
      }
      OR for conditional:
      {
        "type": "conditional",
        "condition": {
          "operator": ">",
          "left": { "type": "component", "code": "BASIC" },
          "right": { "type": "number", "value": 50000 }
        },
        "then": { ... },
        "else": { ... }
      }
      */
    },

    variables: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'List of component codes/names used in this formula',
      /* Example: ["BASIC", "HRA", "DA"] */
    },

    targetComponentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'salary_components',
        key: 'salaryComponentId', // ← Updated to match expected PK
      },
      onDelete: 'SET NULL',
      comment: 'The salary component this formula calculates',
    },

    applicableDesignations: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of designation IDs this formula applies to. Empty = all designations.',
      /* Example: [1, 3, 5] */
    },
,

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this formula is currently active',
    },

    validFrom: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date from which this formula is valid',
    },

    validTo: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date until which this formula is valid',
    },

    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Execution priority (lower number = higher priority)',
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
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'User ID who created this formula',
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'User ID who last updated this formula',
    },

  }, {
    tableName: 'formulas',
    timestamps: true,
    indexes: [
      {
        fields: ['companyId', 'isActive'],
        name: 'idx_company_active',
      },
      {
        fields: ['targetComponentId'],
        name: 'idx_target_component',
      },
      {
        fields: ['formulaType', 'isActive'],
        name: 'idx_formula_type_active',
      },
    ],
  });

  Formula.associate = (models) => {
    // Association with Company
    Formula.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    // Association with SalaryComponent (target component)
    Formula.belongsTo(models.SalaryComponent, {
      foreignKey: 'targetComponentId',
      as: 'targetComponent',
    });

    // Optional: reverse association if needed
    // models.SalaryComponent.hasMany(models.Formula, { foreignKey: 'targetComponentId', as: 'formulas' });
  };

  // Development sync (optional)
  // if (process.env.NODE_ENV === 'development') {
  //   Formula.sync({ alter: true })
  //     .then(() => console.log('Formula table synced successfully'))
  //     .catch(err => console.error('Error syncing Formula table:', err));
  // }

  return Formula;
};