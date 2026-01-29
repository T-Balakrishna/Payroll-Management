const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Company = sequelize.define('Company', {
    companyId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    companyName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      comment: 'Full legal/official name of the company',
    },

    companyAcr: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Short acronym/code (e.g. "ABCPL", "XYZHR")',
    },

    logo: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Path/URL to company logo',
    },

    registrationNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      comment: 'Company registration / CIN number',
    },

    // Tax & Identification
    pan: {
      type: DataTypes.STRING(10),
      allowNull: true,
      unique: true,
      comment: 'Permanent Account Number (PAN)',
    },

    gst: {
      type: DataTypes.STRING(15),
      allowNull: true,
      unique: true,
      comment: 'GST Identification Number',
    },

    tin: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Tax Identification Number (if applicable)',
    },

    // Contact Information
    phone: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },

    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    // Address (flexible JSON format - very practical)
    addresses: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'JSON object with registered/office/branch addresses',
    },

    // Bank Details
    bankName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    bankAccountNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    bankIfscCode: {
      type: DataTypes.STRING(11),
      allowNull: true,
    },

    // Financial Year
    financialYearStart: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    financialYearEnd: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    // HR / Policy related
    permissionHoursPerMonth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Monthly permission hours quota for employees',
    },

    // Status & Audit
    status: {
      type: DataTypes.ENUM('Active', 'Inactive', 'Suspended'),
      allowNull: false,
      defaultValue: 'Active',
    },

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
    tableName: 'companies',
    timestamps: true,
    paranoid: true, // soft deletes (optional but recommended)

    indexes: [
      {
        fields: ['companyAcr'],
        unique: true,
        name: 'unique_company_acr',
      },
      {
        fields: ['companyName'],
        unique: true,
        name: 'unique_company_name',
      },
      {
        fields: ['status'],
        name: 'idx_company_status',
      },
      {
        fields: ['companyId'],
        name: 'idx_company_id',
      },
    ],
  });

  // Associations (clean & consistent)
  Company.associate = (models) => {
    Company.hasMany(models.Employee, {
      foreignKey: 'companyId',
      as: 'employees',
    });

    Company.hasMany(models.Department, {
      foreignKey: 'companyId',
      as: 'departments',
    });

    Company.hasMany(models.Designation, {
      foreignKey: 'companyId',
      as: 'designations',
    });

    Company.hasMany(models.BiometricDevice, {
      foreignKey: 'companyId',
      as: 'devices',
    });

    Company.hasMany(models.Bus, {
      foreignKey: 'companyId',
      as: 'buses',
    });

    Company.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });

    Company.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
    });
  };

  // Optional development sync
  // if (process.env.NODE_ENV === 'development') {
  //   Company.sync({ alter: true })
  //     .then(() => console.log('Company table synced successfully'))
  //     .catch(err => console.error('Error syncing Company table:', err));
  // }

  return Company;
};