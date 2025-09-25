import { QueryResult } from './../node_modules/@types/pg/index.d';
import { UrlData } from './model/url';
import { isUrlValid } from './utils/urlUtils';
import { initDb } from './migrations/001_init_db';
import { pool } from './config/database';

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { randomBytes } from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config({ path: '../.env' });

(async () => {
    await initDb();
})();

app.post('/shorten', async (req, res) => {
    if (!req.body) {
        return res.status(400).json({ error: 'Invalid request' });
    }
    const { originalUrl } = req.body;
    if (!originalUrl || !isUrlValid(originalUrl)) {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    const id = randomBytes(5).toString('hex');
    const shortUrl = `${process.env.DEV_URL}/${id}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    try {
        const result = await pool.query(`
            INSERT INTO urls_table (id, original_url, short_url, expires_at)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `, [id, originalUrl, shortUrl, expiresAt]);

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error to inserting url: ', error);
        res.status(500).json({ error: 'Error to inserting url' });
    }
});

app.get('/:shortUrl', async (req, res) => {
    const { shortUrl } = req.params;

    try {
        const result = await pool.query(`
            SELECT * FROM urls_table WHERE short_url ILIKE $1;`,
            [`%${shortUrl}`]
        );

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Url not found' });
        }

        const resultFound = result.rows[0];
        const url: UrlData = ({
            id: resultFound.id,
            originalUrl: resultFound.original_url,
            shortUrl: resultFound.short_url,
            expiresAt: resultFound.expires_at,
            hits: resultFound.hits
        });

        if (url.expiresAt <= new Date()) {
            return res.status(410).json({ error: 'Url expired' });
        }

        await pool.query(`
            UPDATE urls_table SET hits = hits + 1 WHERE short_url ILIKE $1;`,
            [`%${shortUrl}`]
        );

        res.redirect(url.originalUrl);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(`${process.env.SERVER_PORT}`, () => {
    console.log(`Server running on port ${process.env.DEV_URL}`);
});