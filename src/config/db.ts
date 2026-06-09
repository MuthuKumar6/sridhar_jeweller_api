import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jewel_erp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // 10 seconds — prevents cold-start failures on EC2/cloud
});

export const checkDBConnection = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1 as test');
    console.log('✅ MySQL Database Connected Successfully');
    connection.release();
    return true;
  } catch (error: any) {
    console.error('❌ MySQL Database Connection Failed');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Hint: Check if MySQL server is running and credentials are correct.');
    return false;
  }
};

export default pool;