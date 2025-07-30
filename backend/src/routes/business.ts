// backend/src/routes/business.ts
import express from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { createDatabaseConnection } from '../config/database';
import { Business, BusinessWithStaff, Service, StaffMember, ApiResponse } from '../types';

const router = express.Router();

// GET /businesses - Alle aktiven Businesses abrufen (öffentlich)
router.get('/', async (req, res) => {
    console.log("Received request: GET /businesses");
    
    try {
        const db = await createDatabaseConnection();
        
        // Nur aktive Businesses abrufen
        const [businesses] = await db.execute<RowDataPacket[]>(
            `SELECT id, name, type, email, phone, address, city, postal_code, country,
                    description, website_url, instagram_handle, booking_link_slug,
                    booking_advance_days, cancellation_hours, require_phone, 
                    require_deposit, deposit_amount, created_at, updated_at
             FROM business 
             WHERE is_active = true 
             ORDER BY name ASC`
        );

        const typedBusinesses = businesses as Business[];

        res.json({
            success: true,
            data: typedBusinesses,
            message: `${typedBusinesses.length} businesses found`
        } as ApiResponse<Business[]>);
        
        console.log(`Response sent | ${typedBusinesses.length} businesses found`);
    } catch (error) {
        console.error('Get businesses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve businesses',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

export default router;