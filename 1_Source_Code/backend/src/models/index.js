const sequelize = require('../config/database');
const Employee = require('./Employee');
const Department = require('./Department');
const Position = require('./Position');
const UserAccount = require('./UserAccount');

// Position - Department
Position.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Department.hasMany(Position, { foreignKey: 'department_id', as: 'positions' });

// Employee - Position
Employee.belongsTo(Position, { foreignKey: 'position_id', as: 'position' });
Position.hasMany(Employee, { foreignKey: 'position_id', as: 'employees' });

// Employee - Direct Manager (Self-referencing)
Employee.belongsTo(Employee, { foreignKey: 'direct_manager_id', as: 'manager' });
Employee.hasMany(Employee, { foreignKey: 'direct_manager_id', as: 'subordinates' });

// Department - Manager (Employee)
Department.belongsTo(Employee, { foreignKey: 'manager_id', as: 'manager' });

// Employee - UserAccount
UserAccount.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
Employee.hasOne(UserAccount, { foreignKey: 'employee_id', as: 'account' });

module.exports = {
  sequelize,
  Employee,
  Department,
  Position,
  UserAccount
};
