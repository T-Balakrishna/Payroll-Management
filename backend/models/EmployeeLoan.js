// models/EmployeeLoan.js
import { DataTypes } from 'sequelize';
export default (sequelize) => {
  const EmployeeLoan = sequelize.define('EmployeeLoan', {
    employeeLoanId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'staff_details',
        key: 'staffId'
      },
      onDelete: 'CASCADE'
    },
    loanType: {
      type: DataTypes.ENUM('Personal Loan', 'Home Loan', 'Vehicle Loan', 'Education Loan', 'Emergency Loan', 'Advance'),
      allowNull: false,
      defaultValue: 'Personal Loan'
    },
    loanAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Total loan amount sanctioned'
    },
    interestRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Interest rate percentage (if applicable)'
    },
    sanctionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date when loan was sanctioned'
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date from which deduction starts'
    },
    numberOfInstallments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Total number of installments'
    },
    installmentAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Amount to be deducted per month'
    },
    paidInstallments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of installments paid so far'
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total amount paid so far'
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Current status of the loan'
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'staff_details',
        key: 'staffId'
      },
      comment: 'Employee ID who approved the loan'
    },
    approvedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date when loan was approved'
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional remarks or notes'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for taking the loan'
    }
  }, {
    tableName: 'employee_loans',
    timestamps: true,
    indexes: [
      {
        fields: ['staffId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['sanctionDate']
      }
    ]
  });

  EmployeeLoan.associate = (models) => {
    EmployeeLoan.belongsTo(models.Employee, {
      foreignKey: 'staffId',
      as: 'employee'
    });

    EmployeeLoan.belongsTo(models.Employee, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });
  };

  return EmployeeLoan;
};
