// backend/src/routes/availability.ts
import express from 'express';
import { AvailabilityService } from '../services/availabilityService';
import { ApiResponse, DayAvailability } from '../types';

const router = express.Router();

// GET /availability/:businessSlug/:serviceId?date=YYYY-MM-DD
router.get('/:businessSlug/:serviceId', async (req, res) => {
    console.log(`Received request: GET /availability/${req.params.businessSlug}/${req.params.serviceId}`);
    
    try {
        const { businessSlug, serviceId } = req.params;
        const { date } = req.query;
        
        if (!date || typeof date !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Date parameter is required (YYYY-MM-DD format)'
            } as ApiResponse<void>);
        }
        
        // Validate date format
        const requestedDate = new Date(date);
        if (isNaN(requestedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            } as ApiResponse<void>);
        }
        
        // Get business ID from slug
        const businessId = await AvailabilityService.getBusinessIdFromSlug(businessSlug);
        if (!businessId) {
            return res.status(404).json({
                success: false,
                message: 'Business not found'
            } as ApiResponse<void>);
        }
        
        // Validate service
        const serviceIdNum = parseInt(serviceId);
        if (isNaN(serviceIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid service ID'
            } as ApiResponse<void>);
        }
        
        const service = await AvailabilityService.getServiceDetails(serviceIdNum, businessId);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            } as ApiResponse<void>);
        }
        
        // Get availability
        const availability = await AvailabilityService.getAvailableSlots(businessId, serviceIdNum, date);
        
        res.json({
            success: true,
            data: availability,
            message: `Found ${availability.time_slots.filter(s => s.available).length} available slots`
        } as ApiResponse<DayAvailability>);
        
        console.log(`Response sent | ${availability.time_slots.length} total slots, ${availability.time_slots.filter(s => s.available).length} available`);
        
    } catch (error) {
        console.error('Get availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve availability',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

// GET /availability/:businessSlug/week?date=YYYY-MM-DD&service_id=X
router.get('/:businessSlug/week', async (req, res) => {
    console.log(`Received request: GET /availability/${req.params.businessSlug}/week`);
    
    try {
        const { businessSlug } = req.params;
        const { date, service_id } = req.query;
        
        if (!date || typeof date !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Date parameter is required (YYYY-MM-DD format)'
            } as ApiResponse<void>);
        }
        
        if (!service_id || typeof service_id !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Service ID parameter is required'
            } as ApiResponse<void>);
        }
        
        const serviceIdNum = parseInt(service_id);
        if (isNaN(serviceIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid service ID format'
            } as ApiResponse<void>);
        }
        
        // Validate date format
        const startDate = new Date(date);
        if (isNaN(startDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            } as ApiResponse<void>);
        }
        
        // Get week availability using service
        const weekAvailability = await AvailabilityService.getWeekAvailability(
            businessSlug, 
            serviceIdNum, 
            date
        );
        
        res.json({
            success: true,
            data: weekAvailability,
            message: `Week availability retrieved for ${businessSlug}`
        } as ApiResponse<DayAvailability[]>);
        
        console.log(`Response sent | Week availability for ${businessSlug} service ${serviceIdNum}`);
        
    } catch (error) {
        console.error('Get week availability error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to retrieve week availability',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

export default router;