const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmployeeType = sequelize.define('EmployeeType', {
    employeeTypeId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    employeeTypeName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Full name of employee type (e.g. "Permanent", "Contract", "Probation", "Intern")',
    },

    employeeTypeAcr: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Short code/abbreviation (e.g. "PERM", "CONT", "PROB", "INT")',
    },

    // Optional: useful for PF applicability, notice period, etc.
    isPfApplicable: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
      comment: 'Whether this employee type is eligible for PF contribution',
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
        model: 'Company',
        key: 'companyId',
      },
      onDelete: 'CASCADE',
    },

    // Audit fields – corrected to use correct user PK
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'User',
        key: 'userId',
      },
      onDelete: 'SET NULL',
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'User',
        key: 'userId',
      },
      onDelete: 'SET NULL',
    },

  }, {
    tableName: 'employee_types',
    timestamps: true,
    paranoid: true, // optional - soft deletes

    indexes: [
      {
        unique: true,
        fields: ['companyId', 'employeeTypeName'],
        name: 'unique_company_employee_type_name'
      },
      {
        unique: true,
        fields: ['companyId', 'employeeTypeAcr'],
        name: 'unique_company_employee_type_acr'
      },
      {
        fields: ['companyId', 'status'],
        name: 'idx_company_employee_type_status'
      }
    ]
  });

  // Associations
  EmployeeType.associate = (models) => {
    EmployeeType.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company'
    });

    EmployeeType.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    EmployeeType.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });

    EmployeeType.hasMany(models.Employee, {
      foreignKey: 'employeeTypeId',
      as: 'employees'
    });

    EmployeeType.hasMany(models.LeavePolicy, {
      foreignKey: 'employmentTypeId',
      as: 'leavePolicies'
    });
  };

  // Optional - development only
  // if (process.env.NODE_ENV === 'development') {
  //   EmployeeType.sync({ alter: true })
  //     .then(() => console.log('EmployeeType table synced successfully'))
  //     .catch(err => console.error('Error syncing EmployeeType table:', err));
  // }

  return EmployeeType;
};
