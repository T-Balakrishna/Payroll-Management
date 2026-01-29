const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Designation = sequelize.define('Designation', {
    designationId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    designationName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Full name of the designation/post (e.g. "Senior Software Engineer", "Finance Manager")',
    },

    designationAcr: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Short code/abbreviation (e.g. "SSE", "AM", "TL", "FM")',
    },

    status: {
      type: DataTypes.ENUM('Active', 'Inactive', 'Archived'),
      allowNull: false,
      defaultValue: 'Active',
      comment: 'Current status of the designation',
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
    tableName: 'designations',
    timestamps: true,
    paranoid: true, // soft deletes (recommended)

    indexes: [
      {
        unique: true,
        fields: ['companyId', 'designationName'],
        name: 'unique_company_designation_name',
      },
      {
        unique: true,
        fields: ['companyId', 'designationAcr'],
        name: 'unique_company_designation_acr',
      },
      {
        fields: ['companyId', 'status'],
        name: 'idx_company_designation_status',
      },
      {
        fields: ['status'],
        name: 'idx_designation_status',
      },
    ],
  });

  // Associations (clean & consistent)
  Designation.associate = (models) => {
    Designation.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    Designation.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });

    Designation.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
    });

    Designation.hasMany(models.Employee, {
      foreignKey: 'designationId',
      as: 'employees',
    });
  };

  // Optional: Development-only table sync
  // if (process.env.NODE_ENV === 'development') {
  //   Designation.sync({ alter: true })
  //     .then(() => console.log('Designation table synced successfully'))
  //     .catch(err => console.error('Error syncing Designation table:', err));
  // }

  return Designation;
};