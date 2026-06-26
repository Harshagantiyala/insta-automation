const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');
const InstagramAccount = require('./InstagramAccount');

class Flow extends Model {}

Flow.init(
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
    instagramAccountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: InstagramAccount,
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    trigger: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    action: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    fallback: {
      type: DataTypes.JSON,
      defaultValue: null,
    },
    stats: {
      type: DataTypes.JSON,
      defaultValue: () => ({ triggeredCount: 0, lastTriggeredAt: null }),
    },
  },
  {
    sequelize,
    modelName: 'Flow',
    tableName: 'flows',
    timestamps: true,
    indexes: [
      {
        fields: ['tenantId', 'instagramAccountId', 'isActive'],
      },
    ],
  }
);

Flow.belongsTo(User, { foreignKey: 'tenantId', as: 'tenant' });
User.hasMany(Flow, { foreignKey: 'tenantId', as: 'flows' });

Flow.belongsTo(InstagramAccount, { foreignKey: 'instagramAccountId', as: 'instagramAccount' });
InstagramAccount.hasMany(Flow, { foreignKey: 'instagramAccountId', as: 'flows' });

module.exports = Flow;
