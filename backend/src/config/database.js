const { Sequelize } = require('sequelize');
require('dotenv').config();

// Sử dụng chuỗi kết nối duy nhất từ Supabase (nhớ có đuôi ?pgbouncer=true)
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // console gọn gàng
  
  // [QUAN TRỌNG] Bắt buộc phải có đoạn này khi đẩy lên mây
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false 
    }
  },

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
    console.log("✅ Kết nối Supabase PostgreSQL thành công!");
  })
  .catch((error) => {
    console.error("❌ Lỗi kết nối PostgreSQL:", error);
  });

module.exports = sequelize;