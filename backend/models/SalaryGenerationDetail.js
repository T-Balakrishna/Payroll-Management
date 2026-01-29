const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SalaryGenerationDetail = sequelize.define('SalaryGenerationDetail', {
    salaryGenerationDetailId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    salaryGenerationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'SalaryGeneration',
        key: 'salaryGenerationId',
      },
      onDelete: 'CASCADE',
    },

    componentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'SalaryComponent',
        key: 'salaryComponentId',
      },
      onDelete: 'RESTRICT',
    },

    componentName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Snapshot of component name at time of generation',
    },

    componentType: {
      type: DataTypes.ENUM('Earning', 'Deduction'),
      allowNull: false,
    },

    calculationType: {
      type: DataTypes.ENUM('Fixed', 'Percentage', 'Formula'),
      allowNull: false,
    },

    baseAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      comment: 'Base amount before any calculation/proration',
    },

    calculatedAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Final calculated amount for this component',
    },

    isProrated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether amount was prorated based on attendance/partial period',
    },

    proratedAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      comment: 'Amount after proration (if applicable)',
    },

    formula: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Formula expression used (if calculationType is Formula)',
    },

    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Any special remarks for this component instance',
    },

    // Audit fields (consistent with your other models)
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'User',
        key: 'userId',
      },
      onDelete: 'SET NULL',
      comment: 'User who created/recorded this detail',
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'User',
        key: 'userId',
      },
      onDelete: 'SET NULL',
      comment: 'User who last updated this detail',
    },

  }, {
    tableName: 'SalaryGenerationDetail',  // ← exact model name as table name
    timestamps: true,
    paranoid: true,

    indexes: [
      {
        fields: ['salaryGenerationId'],
        name: 'idx_salary_generation',
      },
      {
        fields: ['componentId'],
        name: 'idx_component',
      },
      {
        fields: ['salaryGenerationId', 'componentId'],
        unique: true,
        name: 'unique_generation_component',
      },
    ],
  });

  // Associations
  SalaryGenerationDetail.associate = (models) => {
    SalaryGenerationDetail.belongsTo(models.SalaryGeneration, {
      foreignKey: 'salaryGenerationId',
      as: 'salaryGeneration',
    });

    SalaryGenerationDetail.belongsTo(models.SalaryComponent, {
      foreignKey: 'salaryComponentId',
      as: 'salaryComponent',
    });

    SalaryGenerationDetail.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    SalaryGenerationDetail.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });

    SalaryGenerationDetail.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
    });
  };

  // Optional development sync
  // if (process.env.NODE_ENV === 'development') {
  //   SalaryGenerationDetail.sync({ alter: true })
  //     .then(() => console.log('SalaryGenerationDetail table synced successfully'))
  //     .catch(err => console.error('Error syncing SalaryGenerationDetail table:', err));
  // }

  return SalaryGenerationDetail;
};