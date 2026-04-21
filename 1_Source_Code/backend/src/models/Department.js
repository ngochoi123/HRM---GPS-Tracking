const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  department_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  manager_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  branch_id: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'department',
  freezeTableName: true,
  timestamps: false // Adjust if you have created_at/updated_at
});

module.exports = Department;
