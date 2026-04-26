const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AIAlert = sequelize.define('AIAlert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  alert_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  risk_level: {
    type: DataTypes.STRING(20)
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'PENDING'
  }
}, {
  tableName: 'ai_alerts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = AIAlert;