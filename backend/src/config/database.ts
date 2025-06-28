import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbconfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

export const createDatabaseConnection = async () => {
    try {
        const connection = await mysql.createConnection(dbconfig);
        console.log('Connected to MySQL database!');
        return connection;
    } catch (error) {
        console.error('Database connection failed!:', error);
        throw error;
    }
};

export const createPool = () => {
    return mysql.createPool({
        ...dbconfig,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });
};

export const pool = createPool();