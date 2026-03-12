const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mentiscore-db'
});

const db = pool.promise();

db.getConnection()
  .then((conn) => {
    console.log('✅ MySQL Connected');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ MySQL connection failed:', err);
  });

module.exports = db;
