const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');
const InstagramAccount = require('./InstagramAccount');
const Flow = require('./Flow');

class MessageLog extends Model {}

MessageLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    instagramAccountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: InstagramAccount,
        key: 'id',
      },
    },
    flowId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Flow,
        key: 'id',
      },
    },
    recipientIgId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    triggerType: {
      type: DataTypes.ENUM('comment_keyword', 'dm_inbound', 'story_mention', 'story_reply', 'fallback'),
      allowNull: false,
    },
    sourceCommentId: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    sourceMediaId: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('queued', 'sent', 'failed', 'skipped_duplicate', 'skipped_rate_limit'),
      defaultValue: 'queued',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    sentAt: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: 'MessageLog',
    tableName: 'message_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['tenantId'],
      },
      {
        fields: ['instagramAccountId', 'recipientIgId', 'createdAt'],
      },
    ],
  }
);

MessageLog.belongsTo(User, { foreignKey: 'tenantId', as: 'tenant' });
User.hasMany(MessageLog, { foreignKey: 'tenantId', as: 'messageLogs' });

MessageLog.belongsTo(InstagramAccount, { foreignKey: 'instagramAccountId', as: 'instagramAccount' });
InstagramAccount.hasMany(MessageLog, { foreignKey: 'instagramAccountId', as: 'messageLogs' });

MessageLog.belongsTo(Flow, { foreignKey: 'flowId', as: 'flow' });
Flow.hasMany(MessageLog, { foreignKey: 'flowId', as: 'messageLogs' });

module.exports = MessageLog;
