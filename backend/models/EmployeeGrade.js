const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const EmployeeGrade = sequelize.define('EmployeeGrade', {
        employeeGradeId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        employeeGradeName: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Full name of the grade (e.g. "Grade A - Senior", "Teaching Faculty Level 1")',
        },

        employeeGradeAcr: {                    // ← consistent naming pattern with Department & Designation
            type: DataTypes.STRING(10),
            allowNull: false,
            comment: 'Short code/abbreviation (e.g. "GA", "L1", "TCH-A")',
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

        // Audit fields (consistent with other models)
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
        tableName: 'employee_grades',
        timestamps: true,
        paranoid: true, // optional - soft deletes
        indexes: [
            {
                unique: true,
                fields: ['companyId', 'employeeGradeName'],
                name: 'unique_company_grade_name'
            },
            {
                unique: true,
                fields: ['companyId', 'employeeGradeAcr'],
                name: 'unique_company_grade_acr'
            },
            {
                fields: ['companyId', 'status'],
                name: 'idx_company_grade_status'
            },
        ]
    });

    // Associations
    EmployeeGrade.associate = (models) => {
        EmployeeGrade.belongsTo(models.Company, {
            foreignKey: 'companyId',
            as: 'company'
        });

        EmployeeGrade.belongsTo(models.User, {
            as: 'Creator',
            foreignKey: 'createdBy'
        });

        EmployeeGrade.belongsTo(models.User, {
            as: 'Updater',
            foreignKey: 'updatedBy'
        });

        EmployeeGrade.hasMany(models.Employee, {
            foreignKey: 'gradeId',
            as: 'employees'
        });
    };

    // Optional development sync
    // if (process.env.NODE_ENV === 'development') {
    //     EmployeeGrade.sync({ alter: true })
    //         .then(() => console.log('EmployeeGrade table synced successfully'))
    //         .catch(err => console.error('Error syncing EmployeeGrade table:', err));
    // }

    return EmployeeGrade;
};