// backend/src/routes/biz.ts
import express from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { createDatabaseConnection } from '../config/database';
import { Business, BusinessWithStaff, Service, StaffMember, ApiResponse } from '../types';

const router = express.Router();

// GET /biz - Get businesses (all or single based on query parameters)
router.get('/', async (req, res) => {
    console.log("Received request: GET /biz");
    console.log("Query parameters:", req.query);
    
    try {
        const { id } = req.query;
        const db = await createDatabaseConnection();
        
        // If 'id' parameter is provided, return single business
        if (id) {
            console.log(`Getting business by ID: ${id}`);
            
            const businessIdNum = parseInt(id.toString());
            if (isNaN(businessIdNum)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid business ID format'
                } as ApiResponse<void>);
            }
            
            // Business über ID finden
            const [bizById] = await db.execute<RowDataPacket[]>(
                `SELECT id, name, type, email, phone, address, city, postal_code, country,
                        description, website_url, instagram_handle, booking_link_slug,
                        booking_advance_days, cancellation_hours, require_phone, 
                        require_deposit, deposit_amount, created_at, updated_at
                 FROM business 
                 WHERE id = ? AND is_active = true`,
                [businessIdNum]
            );
            
            if (bizById.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Business not found'
                } as ApiResponse<void>);
            }
            
            const business = bizById[0] as Business;
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
            
            return res.json({
                success: true,
                data: businessWithDetails,
                message: 'Business details retrieved successfully'
            } as ApiResponse<BusinessWithStaff>);
        }
        
        // No specific business requested - return all businesses
        console.log("Getting all businesses");
        
        const [allBiz] = await db.execute<RowDataPacket[]>(
            `SELECT id, name, type, email, phone, address, city, postal_code, country,
                    description, website_url, instagram_handle, booking_link_slug,
                    booking_advance_days, cancellation_hours, require_phone, 
                    require_deposit, deposit_amount, created_at, updated_at
             FROM business 
             WHERE is_active = true 
             ORDER BY name ASC`
        );
        
        const typedBiz = allBiz as Business[];
        
        res.json({
            success: true,
            data: typedBiz,
            message: `${typedBiz.length} businesses found`
        } as ApiResponse<Business[]>);
        
        console.log(`Response sent | ${typedBiz.length} businesses found`);
        
    } catch (error) {
        console.error('Get business error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve businesses',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

export default router;