import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createDatabaseConnection } from './config/database';
import { timeStamp } from 'console';
import { start } from 'repl';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Middleware - allows requests from frontend only
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ?


// Routes

// Homepage
app.get('/', (req, res) => {
    res.json({ message: 'Backend API Server running. Current route: /' });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
});

// Other business routes...


// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong! Maybe error in auth...' });
});

// Start the server
const startServer = async () => {
    try {
        // Test database connection
        await createDatabaseConnection();

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit();
    }
};

startServer();