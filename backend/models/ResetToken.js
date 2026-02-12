// models/ResetToken.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ResetToken = sequelize.define("ResetToken", {
    tokenId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",   // table name (recommended)
        key: "userId",
      },
      onDelete: "CASCADE",
      comment: "User associated with this reset token",
    },

    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Hashed password reset token",
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "Token expiration date and time",
    },

  }, {
    tableName: "reset_tokens",
    timestamps: false,   // keeping same behavior as old model
    indexes: [
      {
        fields: ["userId"],
        name: "idx_reset_user",
      },
      {
        fields: ["token"],
        name: "idx_reset_token",
      },
      {
        fields: ["expiresAt"],
        name: "idx_reset_expiry",
      },
    ],
  });

  // Associations (clean & consistent)
  ResetToken.associate = (models) => {
    ResetToken.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return ResetToken;
};
