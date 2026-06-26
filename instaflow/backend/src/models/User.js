const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

class User extends Model {
  comparePassword(candidate) {
    return bcrypt.compare(candidate, this.passwordHash);
  }

  static hashPassword(plain) {
    return bcrypt.hash(plain, 12);
  }
}

User.init(
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('owner', 'member'),
      defaultValue: 'owner',
    },
    subscriptionPlan: {
      type: DataTypes.ENUM('free', 'starter', 'pro'),
      defaultValue: 'free',
    },
    subscriptionStatus: {
      type: DataTypes.ENUM('inactive', 'trialing', 'active', 'past_due', 'canceled'),
      defaultValue: 'inactive',
    },
    stripeCustomerId: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    stripeSubscriptionId: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    currentPeriodEnd: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    subscription: {
      type: DataTypes.VIRTUAL,
      get() {
        return {
          plan: this.subscriptionPlan,
          status: this.subscriptionStatus,
          stripeCustomerId: this.stripeCustomerId,
          stripeSubscriptionId: this.stripeSubscriptionId,
          currentPeriodEnd: this.currentPeriodEnd,
        };
      },
      set(val) {
        if (val) {
          if (val.plan) this.subscriptionPlan = val.plan;
          if (val.status) this.subscriptionStatus = val.status;
          if (val.stripeCustomerId) this.stripeCustomerId = val.stripeCustomerId;
          if (val.stripeSubscriptionId) this.stripeSubscriptionId = val.stripeSubscriptionId;
          if (val.currentPeriodEnd) this.currentPeriodEnd = val.currentPeriodEnd;
        }
      },
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeValidate: (user) => {
        if (user.email) {
          user.email = user.email.toLowerCase().trim();
        }
      },
    },
  }
);

module.exports = User;
