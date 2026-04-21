const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employee_code: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone_number: {
    type: DataTypes.STRING
  },
  personal_email: {
    type: DataTypes.STRING
  },
  work_email: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.TEXT
  },
  identity_card_number: {
    type: DataTypes.STRING
  },
  date_of_birth: {
    type: DataTypes.DATEONLY
  },
  gender: {
    type: DataTypes.BOOLEAN
  },
  bank_account_number: {
    type: DataTypes.STRING
  },
  bank_name: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },
  position_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  join_date: {
    type: DataTypes.DATEONLY
  },
  direct_manager_id: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'employee',
  freezeTableName: true,
  timestamps: true, // Use TRUE if created_at/updated_at exist
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Employee;
