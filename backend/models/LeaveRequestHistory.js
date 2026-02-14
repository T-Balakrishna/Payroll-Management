import { DataTypes } from 'sequelize';
export default (sequelize) => {
  const LeaveRequestHistory = sequelize.define('LeaveRequestHistory', {
    leaveRequestHistoryId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    // Request Reference
    leaveRequestId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'leave_requests',
        key: 'leaveRequestId',
      },
      onDelete: 'CASCADE',
    },

    // Action Details
    action: {
      type: DataTypes.ENUM(
        'Created',
        'Submitted',
        'Approved',
        'Rejected',
        'Cancelled',
        'Modified',
        'Withdrawn',
        'Forwarded',
        'Deleted',
        'Restored'
      ),
      allowNull: false,
    },

    actionBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'staff_details',
        key: 'staffId',
      },
      onDelete: 'RESTRICT',
      comment: 'Employee who performed the action',
    },

    actionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    // Status Tracking (now using ENUM for consistency with LeaveRequest)
    oldStatus: {
      type: DataTypes.ENUM(
        'Draft',
        'Pending',
        'Approved',
        'Rejected',
        'Cancelled',
        'Withdrawn'
      ),
      allowNull: true,
      comment: 'Previous status before this action',
    },

    newStatus: {
      type: DataTypes.ENUM(
        'Draft',
        'Pending',
        'Approved',
        'Rejected',
        'Cancelled',
        'Withdrawn'
      ),
      allowNull: true,
      comment: 'New status after this action',
    },

    // Comments & Context
    comments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Comments or notes about the action',
    },

    actionContext: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional context data (changes made, approver level, etc.)',
    },

    // IP & Device Info
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address from which action was taken',
    },

    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser/device information',
    },

    // Company & Audit
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
    tableName: 'leave_request_histories', // ← Changed to plural
    timestamps: true,
    updatedAt: false, // History records should never be updated
    indexes: [
      {
        fields: ['leaveRequestId', 'actionDate'],
        name: 'idx_request_action_date',
      },
      {
        fields: ['actionBy'],
        name: 'idx_action_by',
      },
      {
        fields: ['action'],
        name: 'idx_action_type',
      },
      {
        fields: ['actionDate'],
        name: 'idx_action_date',
      },
      {
        fields: ['leaveRequestId'],
        name: 'idx_leave_request',
      },
    ],
  });

  // Static Method to log history (improved with transaction safety)
  LeaveRequestHistory.logAction = async function (data, transaction = null) {
    try {
      return await this.create(
        {
          leaveRequestId: data.leaveRequestId,
          action: data.action,
          actionBy: data.actionBy,
          oldStatus: data.oldStatus || null,
          newStatus: data.newStatus || null,
          comments: data.comments || null,
          actionContext: data.actionContext || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          companyId: data.companyId,
        },
        { transaction }
      );
    } catch (error) {
      console.error('Error logging leave request history:', error);
      throw error;
    }
  };

  // Instance Method (kept as-is — very useful)
  LeaveRequestHistory.prototype.getActionDescription = function () {
    const actionDescriptions = {
      Created: 'Leave request was created',
      Submitted: 'Leave request was submitted for approval',
      Approved: 'Leave request was approved',
      Rejected: 'Leave request was rejected',
      Cancelled: 'Leave request was cancelled',
      Modified: 'Leave request was modified',
      Withdrawn: 'Leave request was withdrawn',
      Forwarded: 'Leave request was forwarded to next approver',
      Deleted: 'Leave request was deleted',
      Restored: 'Leave request was restored',
    };
    return actionDescriptions[this.action] || 'Unknown action';
  };

  // Associations
  LeaveRequestHistory.associate = (models) => {
    LeaveRequestHistory.belongsTo(models.LeaveRequest, {
      foreignKey: 'leaveRequestId',
      as: 'request',
    });

    LeaveRequestHistory.belongsTo(models.Employee, {
      foreignKey: 'actionBy',
      as: 'actor',
    });

    LeaveRequestHistory.belongsTo(models.Company, {
      foreignKey: 'companyId',
    });

    LeaveRequestHistory.belongsTo(models.User, {
      as: 'Creator',
      foreignKey: 'createdBy',
    });

    LeaveRequestHistory.belongsTo(models.User, {
      as: 'Updater',
      foreignKey: 'updatedBy',
    });
  };

  // Development sync
  // if (process.env.NODE_ENV === 'development') {
  //   LeaveRequestHistory.sync({ alter: true })
  //     .then(() => console.log('LeaveRequestHistory table synced successfully'))
  //     .catch(err => console.error('Error syncing LeaveRequestHistory table:', err));
  // }

  return LeaveRequestHistory;
};