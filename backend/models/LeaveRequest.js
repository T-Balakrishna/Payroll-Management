import { DataTypes } from 'sequelize';
export default (sequelize) => {
  const LeaveRequest = sequelize.define('LeaveRequest', {
    leaveRequestId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    // Basic Information
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'staff_details',
        key: 'staffId',
      },
      onDelete: 'CASCADE',
    },

    leaveTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'leave_types',
        key: 'leaveTypeId',
      },
      onDelete: 'RESTRICT',
    },

    leaveAllocationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'leave_allocations',
        key: 'leaveAllocationId',
      },
      onDelete: 'SET NULL',
      comment: 'Link to the specific allocation from which this leave is deducted',
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

    // Date Information
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
      },
    },

    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isAfterStart(value) {
          if (value < this.startDate) {
            throw new Error('End date must be after or equal to start date.');
          }
        },
      },
    },

    totalDays: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 0.0,
      comment: 'Total leave days (can be 0.5 for half day)',
      validate: {
        min: { args: [0], msg: 'Total days cannot be negative.' },
      },
    },

    // Leave Category
    leaveCategory: {
      type: DataTypes.ENUM('Full Day', 'Half Day', 'Short Leave'),
      allowNull: false,
      defaultValue: 'Full Day',
    },

    halfDayType: {
      type: DataTypes.ENUM('First Half', 'Second Half'),
      allowNull: true,
      comment: 'Required if leaveCategory is Half Day',
    },

    // Reason & Documents
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    hasDocuments: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    documentPaths: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of document file paths',
    },

    // Contact Information
    contactDuringLeave: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Phone number to contact during leave',
    },

    addressDuringLeave: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Status & Workflow
    status: {
      type: DataTypes.ENUM(
        'Draft',
        'Pending',
        'Approved',
        'Rejected',
        'Cancelled',
        'Withdrawn'
      ),
      allowNull: false,
      defaultValue: 'Draft',
    },

    currentApprovalLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '0 = not submitted, 1+ = approval levels',
    },

    maxApprovalLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Total number of approval levels required',
    },

    // Application Details
    appliedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when leave was submitted (not draft)',
    },

    submittedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'staff_details',
        key: 'staffId',
      },
      comment: 'If applied by HR/Manager on behalf of employee',
    },

    // Cancellation
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    cancelledBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'staff_details',
        key: 'staffId',
      },
    },

    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Final Approval/Rejection
    finalApprovedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'staff_details',
        key: 'staffId',
      },
    },

    finalApprovedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    finalRejectedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'staff_details',
        key: 'staffId',
      },
    },

    finalRejectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // System Flags
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    // Audit
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal notes by HR/Admin',
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
    tableName: 'leave_requests',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['staffId', 'status'], name: 'idx_employee_status' },
      { fields: ['companyId', 'status'], name: 'idx_company_status' },
      { fields: ['startDate', 'endDate'], name: 'idx_date_range' },
      { fields: ['leaveTypeId'], name: 'idx_leave_type' },
      { fields: ['leaveRequestId'], name: 'idx_leave_request' }, // for approvals
    ],
    validate: {
      halfDayValidation() {
        if (this.leaveCategory === 'Half Day' && !this.halfDayType) {
          throw new Error('Half day type is required for half day leave.');
        }
      },
      documentValidation() {
        if (this.hasDocuments && (!this.documentPaths || this.documentPaths.length === 0)) {
          throw new Error('Document paths must be provided when hasDocuments is true.');
        }
      },
    },
    hooks: {
      beforeValidate: (request) => {
        // Auto-calculate total days
        if (request.leaveCategory === 'Half Day') {
          request.totalDays = 0.5;
        } else if (request.leaveCategory === 'Short Leave') {
          request.totalDays = 0.25;
        }

        // Set applied date when moving from Draft → Pending
        if (request.changed('status') && request.status === 'Pending' && !request.appliedDate) {
          request.appliedDate = new Date();
        }
      },
    },
  });

  // Instance Methods (kept as-is — very useful)
  LeaveRequest.prototype.canBeCancelled = function () {
    return ['Pending', 'Approved'].includes(this.status);
  };

  LeaveRequest.prototype.canBeEdited = function () {
    return this.status === 'Draft';
  };

  LeaveRequest.prototype.isPendingApproval = function () {
    return this.status === 'Pending' && this.currentApprovalLevel < this.maxApprovalLevel;
  };

  LeaveRequest.prototype.isFullyApproved = function () {
    return this.status === 'Approved' && this.currentApprovalLevel === this.maxApprovalLevel;
  };

  // Associations
  LeaveRequest.associate = (models) => {
    LeaveRequest.belongsTo(models.Employee, {
      foreignKey: 'staffId',
      as: 'employee',
    });

    LeaveRequest.belongsTo(models.LeaveType, {
      foreignKey: 'leaveTypeId',
      as: 'leaveType',
    });

    LeaveRequest.belongsTo(models.LeaveAllocation, {
      foreignKey: 'leaveAllocationId',
      as: 'allocation',
    });

    LeaveRequest.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    LeaveRequest.hasMany(models.LeaveApproval, {
      foreignKey: 'leaveRequestId',
      as: 'approvals',
    });

    LeaveRequest.hasMany(models.LeaveRequestHistory, {
      foreignKey: 'leaveRequestId',
      as: 'history',
    });
  };

  // Development sync
  // if (process.env.NODE_ENV === 'development') {
  //   LeaveRequest.sync({ alter: true })
  //     .then(() => console.log('LeaveRequest table synced successfully'))
  //     .catch(err => console.error('Error syncing LeaveRequest table:', err));
  // }

  return LeaveRequest;
};