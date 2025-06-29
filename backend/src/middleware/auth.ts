import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../types';
import { json } from 'stream/consumers';


// Erweitere das Request-Interface um user
declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, 'password_hash'>;
    }
  }
}

export interface JWTPayload {
    userId: number;
    email: string;
    role: string;
}

export const authenticateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer token

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access token required'
            });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Hier könntest du optional den User aus der DB laden
    // für aktuellste Daten, aber für Performance reicht oft das Token
    req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role as 'owner' | 'manager' | 'staff',
        // Man kan noch weiteres laden
    } as Omit<User, 'password_hash'>;

    next(); // Wofür?
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(403).json({
                success: false,
                message: 'Invalid or expired token!'
            });
            return;
        }

        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

// Optional: Role-based middleware
export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(401).json({
                success: false,
                message: 'Insufficient permissions'
            });
            return;
        }
        next();
    };
};

// Utility für Token-Generierung
export const generateTokens = (user: Omit<User, 'password_hash'>) => {
    const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
    };

      // Stelle sicher, dass die Secrets existieren
    const jwtSecret = process.env.JWT_SECRET;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!jwtSecret || !jwtRefreshSecret) {
        throw new Error('JWT secrets are not configured');
    }

    // Einfachere Version ohne TypeScript-Probleme
    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, jwtRefreshSecret, { expiresIn: '7d' });

    return { accessToken, refreshToken };
};