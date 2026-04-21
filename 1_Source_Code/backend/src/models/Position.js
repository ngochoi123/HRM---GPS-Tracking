const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Position = sequelize.define('Position', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  position_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  level: {
    type: DataTypes.ENUM('employee', 'manager', 'director', 'admin'),
    defaultValue: 'employee'
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'position',
  freezeTableName: true,
  timestamps: false
});

module.exports = Position;
