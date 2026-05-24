/**
 * MySQL Database Configuration
 * Connection pool and helper functions
 */

const mysql = require('mysql2');

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'talentproctor',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Get promise-based pool
const promisePool = pool.promise();

/**
 * Test database connection
 */
const testDatabaseConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ MySQL Database Connected Successfully');
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   Host: ${process.env.DB_HOST}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database Connection Failed:');
    console.error(`   Error: ${error.message}`);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure MySQL server is running');
    console.error('   2. Check database credentials in .env file');
    console.error('   3. Verify database exists: CREATE DATABASE talentproctor;');
    console.error('   4. Check MySQL port (default: 3306)');
    throw error;
  }
};

/**
 * Execute a query
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 */
const query = async (sql, params = []) => {
  try {
    const [rows] = await promisePool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database Query Error:', error.message);
    throw error;
  }
};

/**
 * Execute a transaction
 * @param {Function} callback - Transaction operations
 */
const transaction = async (callback) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Close all database connections
 */
const closePool = () => {
  return new Promise((resolve, reject) => {
    pool.end((err) => {
      if (err) {
        console.error('Error closing database pool:', err);
        reject(err);
      } else {
        console.log('✅ Database pool closed');
        resolve();
      }
    });
  });
};

module.exports = {
  pool,
  promisePool,
  query,
  transaction,
  testDatabaseConnection,
  closePool,
};
