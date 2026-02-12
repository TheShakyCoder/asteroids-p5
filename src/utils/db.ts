import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'db',
    password: process.env.DB_PASSWORD || 'db',
    database: process.env.DB_NAME || 'db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export default pool;

export async function initDb() {
    const connection = await pool.getConnection();
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE,
                password_hash VARCHAR(255),
                is_verified TINYINT(1) DEFAULT 0,
                verification_token VARCHAR(255),
                is_guest TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // console.log("Database initialized: 'users' table is ready.");
    } catch (error) {
        console.error("Error initializing database:", error);
    } finally {
        connection.release();
    }
}
