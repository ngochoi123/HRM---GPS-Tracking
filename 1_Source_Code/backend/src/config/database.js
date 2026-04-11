const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const environmentLabel = isProduction ? 'Cloud (Production)' : 'Local Development';

// Sử dụng DATABASE_URL từ biến môi trường cho mọi môi trường
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // console gọn gàng
  dialectOptions: isProduction
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    : {},

  // Cấu hình Pool (Bạn đã set max: 5 rất tốt để chống sập Database)
  pool: {
    max: 5, 
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// 🔥 Test kết nối
sequelize.authenticate()
  .then(() => {
    console.log(`✅ Kết nối PostgreSQL thành công ở môi trường: ${environmentLabel}`);
  })
  .catch((error) => {
    console.error(`❌ Lỗi kết nối PostgreSQL ở môi trường ${environmentLabel}:`, error);
  });

module.exports = sequelize;