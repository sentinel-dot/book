// backend/src/routes/business.ts
import express from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { createDatabaseConnection } from '../config/database';
import { Business, BusinessWithStaff, Service, StaffMember, ApiResponse } from '../types';

const router = express.Router();

// GET /businesses - Alle aktiven Businesses abrufen (öffentlich)
router.get('/all', async (req, res) => {
    console.log("Received request: GET /biz/all");
    
    try {
        const db = await createDatabaseConnection();
        
        // Nur aktive Businesses abrufen
        const [biz] = await db.execute<RowDataPacket[]>(
            `SELECT id, name, type, email, phone, address, city, postal_code, country,
                    description, website_url, instagram_handle, booking_link_slug,
                    booking_advance_days, cancellation_hours, require_phone, 
                    require_deposit, deposit_amount, created_at, updated_at
             FROM business 
             WHERE is_active = true 
             ORDER BY name ASC`
        );

        const typedBiz = biz as Business[];

        res.json({
            success: true,
            data: typedBiz,
            message: `${typedBiz.length} biz found`
        } as ApiResponse<Business[]>);
        
        console.log(`Response sent | ${typedBiz.length} biz found`);
    } catch (error) {
        console.error('Get biz error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve biz',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

// GET /business/:slug - Einzelnes Business über Slug abrufen (öffentlich)
router.get('/:slug', async (req, res) => {
    console.log(`Received request: GET /biz/${req.params.slug}`);
    
    try {
        const slug = req.params.slug;
        
        if (!slug || slug.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Invalid biz slug'
            } as ApiResponse<void>);
        }

        const db = await createDatabaseConnection();
        
        // Business über Slug finden
        const [biz] = await db.execute<RowDataPacket[]>(
            `SELECT id, name, type, email, phone, address, city, postal_code, country,
                    description, website_url, instagram_handle, booking_link_slug,
                    booking_advance_days, cancellation_hours, require_phone, 
                    require_deposit, deposit_amount, created_at, updated_at
             FROM business 
             WHERE booking_link_slug = ? AND is_active = true`,
            [slug]
        );

        if (biz.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Biz not found'
            } as ApiResponse<void>);
        }

        const business = biz[0] as Business;
        const businessId = business.id;

        // Services abrufen
        const [services] = await db.execute<RowDataPacket[]>(
            `SELECT id, business_id, name, description, duration_minutes, price, 
                    capacity, requires_staff, buffer_before_minutes, buffer_after_minutes,
                    created_at, updated_at
             FROM services 
             WHERE business_id = ? AND is_active = true
             ORDER BY name ASC`,
            [businessId]
        );

        // Staff-Mitglieder abrufen
        const [staffMembers] = await db.execute<RowDataPacket[]>(
            `SELECT id, business_id, name, email, phone, description, avatar_url,
                    created_at, updated_at
             FROM staff_members 
             WHERE business_id = ? AND is_active = true
             ORDER BY name ASC`,
            [businessId]
        );

        // Business mit Services und Staff kombinieren
        const businessWithDetails: BusinessWithStaff = {
            ...business,
            services: services as Service[],
            staff_members: staffMembers as StaffMember[]
        };

        res.json({
            success: true,
            data: businessWithDetails,
            message: 'Business details retrieved successfully'
        } as ApiResponse<BusinessWithStaff>);
        
        console.log(`Response sent | Business '${slug}' with ${services.length} services and ${staffMembers.length} staff members`);
    } catch (error) {
        console.error('Get biz details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve biz details',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

export default router;