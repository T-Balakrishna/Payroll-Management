const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GoogleAuth = sequelize.define('GoogleAuth', {
    googleAuthId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    googleId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Google user ID (sub claim from OAuth token)',
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
      comment: 'Google account email address',
    },

    firstName: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    lastName: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    profilePic: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL to Google profile picture',
    },

    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of most recent login with Google',
    },

    // Link to your main User table (very important!)
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId', // ← change to 'userId' if your User model uses userId
      },
      onDelete: 'SET NULL',
      comment: 'Link to the main user account (if connected)',
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
    tableName: 'google_auth',
    timestamps: true,
    paranoid: true, // optional: soft deletes

    indexes: [
      {
        unique: true,
        fields: ['googleId'],
        name: 'idx_google_id_unique',
      },
      {
        unique: true,
        fields: ['email'],
        name: 'idx_email_unique',
      },
      {
        fields: ['userId'],
        name: 'idx_user_id',
      },
    ],
  });

  // Associations (recommended)
  GoogleAuth.associate = (models) => {
    GoogleAuth.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    GoogleAuth.belongsTo(models.User, {
      as: 'Creator',
      foreignKey: 'createdBy',
    });

    GoogleAuth.belongsTo(models.User, {
      as: 'Updater',
      foreignKey: 'updatedBy',
    });
  };

  // Optional development sync
  // if (process.env.NODE_ENV === 'development') {
  //   GoogleAuth.sync({ alter: true })
  //     .then(() => console.log('GoogleAuth table synced successfully'))
  //     .catch(err => console.error('Error syncing GoogleAuth table:', err));
  // }

  return GoogleAuth;
};