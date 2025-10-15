const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");

const ResetToken = sequelize.define(
  "ResetToken",
  {
    tokenId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "userId",
      },
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "ResetTokens",
    timestamps: false,
  }
);

// Associations
ResetToken.belongsTo(User, { foreignKey: "userId" });

module.exports = ResetToken;