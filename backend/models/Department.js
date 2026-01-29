const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Department = sequelize.define('Department', {
    departmentId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    departmentName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Full name of the department (e.g. "Human Resources", "Finance & Accounts")',
    },

    departmentAcr: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Short code / abbreviation (e.g. HR, FIN, IT, OPS)',
    },

    status: {
      type: DataTypes.ENUM('Active', 'Inactive', 'Archived'),
      allowNull: false,
      defaultValue: 'Active',
      comment: 'Current status of the department',
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

    // Audit fields
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId',
      },
      onDelete: 'SET NULL',
    },

  }, {
    tableName: 'departments',
    timestamps: true,
    paranoid: true, // soft deletes (recommended)

    indexes: [
      {
        unique: true,
        fields: ['companyId', 'departmentName'],
        name: 'unique_company_department_name',
      },
      {
        unique: true,
        fields: ['companyId', 'departmentAcr'],
        name: 'unique_company_department_acr',
      },
      {
        fields: ['companyId', 'status'],
        name: 'idx_company_department_status',
      },
      {
        fields: ['status'],
        name: 'idx_department_status',
      },
    ],
  });

  // Associations (clean, consistent & complete)
  Department.associate = (models) => {
    Department.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    Department.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });

    Department.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
    });

    Department.hasMany(models.Employee, {
      foreignKey: 'departmentId',
      as: 'employees',
    });

  };

  // Optional: Development-only table sync
  // if (process.env.NODE_ENV === 'development') {
  //   Department.sync({ alter: true })
  //     .then(() => console.log('Department table synced successfully'))
  //     .catch(err => console.error('Error syncing Department table:', err));
  // }

  return Department;
};