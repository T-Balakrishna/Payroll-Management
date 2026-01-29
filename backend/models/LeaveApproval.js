const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LeaveApproval = sequelize.define('LeaveApproval', {
    leaveApprovalId: {  // ← Changed from 'id'
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    leaveRequestId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'leave_requests',
        key: 'leaveRequestId',  // ← Updated to match LeaveRequest PK
      },
      onDelete: 'CASCADE',
    },

    approverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'employeeId',  // ← Updated to match Employee PK
      },
      onDelete: 'RESTRICT',
      comment: 'Employee ID of the approver',
    },

    approverLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Approval level: 1 = Manager, 2 = Dept Head, etc.',
      validate: {
        min: { args: [1], msg: 'Approver level must be at least 1.' },
      },
    },

    approverRole: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Role description: "Reporting Manager", "Department Head", etc.',
    },

    status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected', 'Forwarded', 'Skipped'),
      allowNull: false,
      defaultValue: 'Pending',
    },

    comments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Comments provided by approver',
    },

    actionDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when action was taken',
    },

    notificationSent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    notificationSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    emailSent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    emailSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'leave_approvals',
    timestamps: true,
    indexes: [
      {
        fields: ['leaveRequestId', 'approverLevel'],
        unique: true,
        name: 'unique_request_approver_level',
      },
      {
        fields: ['approverId', 'status'],
        name: 'idx_approver_status',
      },
      {
        fields: ['leaveRequestId'],
        name: 'idx_leave_request',
      },
    ],
    hooks: {
      beforeCreate: (approval) => {
        if (approval.status !== 'Pending') {
          approval.actionDate = new Date();
        }
      },
      beforeUpdate: (approval) => {
        if (approval.changed('status') && approval.status !== 'Pending' && !approval.actionDate) {
          approval.actionDate = new Date();
        }
      },
    },
  });

  // Associations
  LeaveApproval.associate = (models) => {
    LeaveApproval.belongsTo(models.LeaveRequest, {
      foreignKey: 'leaveRequestId',
      as: 'leaveRequest',
    });

    LeaveApproval.belongsTo(models.Employee, {
      foreignKey: 'approverId',
      as: 'approver',
    });

    LeaveApproval.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    LeaveApproval.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });

    LeaveApproval.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
    });
  };

  // Instance Methods (kept as-is - very useful)
  LeaveApproval.prototype.approve = async function (comments = null) {
    this.status = 'Approved';
    this.actionDate = new Date();
    if (comments) this.comments = comments;
    return await this.save();
  };

  LeaveApproval.prototype.reject = async function (comments) {
    this.status = 'Rejected';
    this.actionDate = new Date();
    this.comments = comments;
    return await this.save();
  };

  LeaveApproval.prototype.forward = async function (comments = null) {
    this.status = 'Forwarded';
    this.actionDate = new Date();
    if (comments) this.comments = comments;
    return await this.save();
  };

  LeaveApproval.prototype.isPending = function () {
    return this.status === 'Pending';
  };

  LeaveApproval.prototype.isActionTaken = function () {
    return ['Approved', 'Rejected', 'Forwarded'].includes(this.status);
  };

  // Development sync (kept as-is)
  // if (process.env.NODE_ENV === 'development') {
  //   LeaveApproval.sync({ alter: true })
  //     .then(() => console.log('LeaveApproval table synced successfully'))
  //     .catch((err) => console.error('Error syncing LeaveApproval table:', err));
  // }

  return LeaveApproval;
};