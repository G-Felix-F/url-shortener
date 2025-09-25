import pool from "../config/database";

export async function initDb() {
    try {
        await pool.query(`
        CREATE TABLE IF NOT EXISTS urls_table (
            id VARCHAR(200) PRIMARY KEY,
            original_url VARCHAR(200) NOT NULL,
            short_url VARCHAR(200) UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            hits INTEGER DEFAULT 0
        );
    `);
        console.log('Success to create urls_table');
    } catch (error) {
        console.error('Error to create url table: ', error);
    }
}