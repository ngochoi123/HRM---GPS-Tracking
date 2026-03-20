const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false, // console gọn gàng
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// 🔥 Test kết nối
sequelize.authenticate()
  .then(() => {
    console.log("✅ Kết nối PostgreSQL thành công");
  })
  .catch((error) => {
    console.error("❌ Lỗi kết nối PostgreSQL:", error);
  });

module.exports = sequelize;