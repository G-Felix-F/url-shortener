import { UrlData } from './model/url';
import { isUrlValid } from './utils/urlUtils';

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { randomBytes } from 'crypto';
import { PrismaClient } from './generated/prisma';

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config({ path: '../.env' });

const prisma = new PrismaClient();

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
        const result = await prisma.url.create({
            data: {
                id: id,
                originalUrl: originalUrl,
                shortUrl: shortUrl,
                expiresAt: expiresAt
            }
        });

        return res.status(201).json(result);
    } catch (error) {
        return res.status(500).json({ error: 'Error to inserting url' });
    }
});

app.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await prisma.url.findFirst({
            where: { id: id }
        });

        if (!result) {
            return res.status(404).json({ error: 'Url not found' });
        }

        if (result.expiresAt <= new Date()) {
            return res.status(410).json({ error: 'Url expired' });
        }

        await prisma.url.update({
            where: { id: result.id },
            data: {
                hits: { increment: 1 }
            }
        });

        return res.redirect(result.originalUrl);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(`${process.env.SERVER_PORT}`, () => {
    console.log(`Server running on port ${process.env.DEV_URL}`);
});