const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

class InstagramAccount extends Model {}

InstagramAccount.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    _id: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.id;
      },
    },
    tenantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    igUserId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    igUsername: {
      type: DataTypes.STRING,
    },
    facebookPageId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    facebookPageName: {
      type: DataTypes.STRING,
    },
    encryptedAccessToken: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tokenType: {
      type: DataTypes.ENUM('short_lived', 'long_lived'),
      defaultValue: 'long_lived',
    },
    tokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    webhookSubscribed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    connectedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    lastTokenRefreshAt: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: 'InstagramAccount',
    tableName: 'instagram_accounts',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['tenantId', 'igUserId'],
      },
    ],
  }
);

InstagramAccount.belongsTo(User, { foreignKey: 'tenantId', as: 'tenant' });
User.hasMany(InstagramAccount, { foreignKey: 'tenantId', as: 'instagramAccounts' });

module.exports = InstagramAccount;
