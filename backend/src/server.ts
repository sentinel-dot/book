import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createDatabaseConnection } from './config/database';

// Import routes
import authRoutes from './routes/auth';

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




//#################################### ROUTES ######################################

// Basic routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'OpenTable Clone Backend API', 
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/auth/*',
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'HEALTHY', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// API routes
app.use('/auth', authRoutes);


// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
    console.log(`Route ${req.originalUrl} not found`);
});

// Global error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error handler:', err.stack);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(isDevelopment && { error: err.message, stack: err.stack })
    });
});

// Start the server
const startServer = async () => {
    try {
        // Test database connection
        await createDatabaseConnection();
        console.log('✅ Database connection established');

        // Validate required environment variables
        const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
        const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
        
        if (missingEnvVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
            console.log(`🔗 CORS enabled for: ${process.env.FRONTEND_URL}`);
            console.log('\n📚 Available endpoints:');
            console.log(`   GET  /health - Health check`);
            console.log(`   POST /auth/register - User registration`);
            console.log(`   POST /auth/login - User login`);
            console.log(`   POST /auth/refresh - Token refresh`);
            console.log(`   POST /auth/logout - User logout`);
            console.log(`   GET  /auth/me - Get current user`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit();
    }
};

startServer();