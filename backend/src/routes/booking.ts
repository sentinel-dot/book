import express from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { createDatabaseConnection } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { AvailabilityService } from '../services/availabilityService';
import { BookingService } from '../services/bookingService';
import { 
    Booking, 
    BookingCreateInput, 
    BookingUpdateInput, 
    BookingWithDetails,
    BookingQuery,
    Service,
    Business,
    StaffMember,
    ApiResponse,
    PaginatedResponse
} from '../types';

const router = express.Router();

// Helper function to validate email
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// POST /bookings - Create new booking (public endpoint)
router.post('/', async (req, res) => {
    console.log("Received request: POST /bookings");
    
    try {
        const bookingData: BookingCreateInput = req.body;
        
        // Basic validation
        if (!bookingData.business_id || !bookingData.service_id || !bookingData.customer_name || 
            !bookingData.customer_email || !bookingData.booking_date || !bookingData.start_time || !bookingData.end_time) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: business_id, service_id, customer_name, customer_email, booking_date, start_time, end_time'
            } as ApiResponse<void>);
        }
        
        if (!isValidEmail(bookingData.customer_email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            } as ApiResponse<void>);
        }
        
        // Use BookingService to create booking
        const result = await BookingService.createBooking(bookingData);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: 'Booking creation failed',
                error: result.errors?.join('; ')
            } as ApiResponse<void>);
        }
        
        // Send confirmation email (async)
        BookingService.sendConfirmation(result.data.booking_id).catch(error => 
            console.error('Failed to send confirmation:', error)
        );
        
        res.status(201).json({
            success: true,
            data: result.data,
            message: 'Booking created successfully'
        } as ApiResponse<any>);
        
        console.log(`Response sent | Booking created with ID ${result.data.booking_id}`);
        
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booking',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

// GET /bookings - Get bookings with filters (protected endpoint)
router.get('/', authenticateToken, async (req, res) => {
    console.log("Received request: GET /bookings");
    
    try {
        const filters = req.query as Partial<BookingQuery>;
        const userId = req.user?.id;
        
        const result = await BookingService.getBookings(filters, userId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve bookings',
                error: result.errors?.join('; ')
            } as ApiResponse<void>);
        }
        
        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination,
            message: `Found ${result.data?.length || 0} bookings`
        } as PaginatedResponse<any>);
        
        console.log(`Response sent | ${result.data?.length || 0} bookings found`);
        
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve bookings',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

// GET /bookings/:id - Get single booking (public endpoint for customers)
router.get('/:id', async (req, res) => {
    console.log(`Received request: GET /bookings/${req.params.id}`);
    
    try {
        const bookingId = parseInt(req.params.id);
        
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID'
            } as ApiResponse<void>);
        }
        
        const booking = await BookingService.getBookingById(bookingId);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            } as ApiResponse<void>);
        }
        
        res.json({
            success: true,
            data: booking,
            message: 'Booking retrieved successfully'
        } as ApiResponse<any>);
        
        console.log(`Response sent | Booking ${bookingId} found`);
        
    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve booking',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

// PUT /bookings/:id - Update booking (protected endpoint)
router.put('/:id', authenticateToken, async (req, res) => {
    console.log(`Received request: PUT /bookings/${req.params.id}`);
    
    try {
        const bookingId = parseInt(req.params.id);
        const updates: BookingUpdateInput = req.body;
        
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID'
            } as ApiResponse<void>);
        }
        
        const result = await BookingService.updateBooking(bookingId, updates);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: 'Booking update failed',
                error: result.errors?.join('; ')
            } as ApiResponse<void>);
        }
        
        res.json({
            success: true,
            data: result.data,
            message: 'Booking updated successfully'
        } as ApiResponse<any>);
        
        console.log(`Response sent | Booking ${bookingId} updated`);
        
    } catch (error) {
        console.error('Update booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

// DELETE /bookings/:id - Cancel booking (public endpoint with email verification)
router.delete('/:id', async (req, res) => {
    console.log(`Received request: DELETE /bookings/${req.params.id}`);
    
    try {
        const bookingId = parseInt(req.params.id);
        const { customer_email, reason } = req.body;
        
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID'
            } as ApiResponse<void>);
        }
        
        if (!customer_email) {
            return res.status(400).json({
                success: false,
                message: 'Customer email is required for cancellation'
            } as ApiResponse<void>);
        }
        
        const result = await BookingService.cancelBooking(bookingId, customer_email, reason);
        
        if (!result.success) {
            const statusCode = result.errors?.[0]?.includes('Email does not match') ? 403 : 
                             result.errors?.[0]?.includes('already cancelled') ? 400 :
                             result.errors?.[0]?.includes('hours before') ? 400 : 500;
            
            return res.status(statusCode).json({
                success: false,
                message: 'Cancellation failed',
                error: result.errors?.join('; ')
            } as ApiResponse<void>);
        }
        
        res.json({
            success: true,
            data: result.data,
            message: 'Booking cancelled successfully'
        } as ApiResponse<any>);
        
        console.log(`Response sent | Booking ${bookingId} cancelled`);
        
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel booking',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

// GET /bookings/upcoming/:businessId - Get upcoming bookings for business (protected)
router.get('/upcoming/:businessId', authenticateToken, async (req, res) => {
    console.log(`Received request: GET /bookings/upcoming/${req.params.businessId}`);
    
    try {
        const businessId = parseInt(req.params.businessId);
        const { days = 7 } = req.query;
        
        if (isNaN(businessId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid business ID'
            } as ApiResponse<void>);
        }
        
        const upcomingBookings = await BookingService.getUpcomingBookings(
            businessId, 
            parseInt(days.toString()) || 7
        );
        
        res.json({
            success: true,
            data: upcomingBookings,
            message: `Found ${upcomingBookings.length} upcoming bookings`
        } as ApiResponse<any[]>);
        
        console.log(`Response sent | ${upcomingBookings.length} upcoming bookings for business ${businessId}`);
        
    } catch (error) {
        console.error('Get upcoming bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve upcoming bookings',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

// GET /bookings/stats/:businessId - Get booking statistics (protected)
router.get('/stats/:businessId', authenticateToken, async (req, res) => {
    console.log(`Received request: GET /bookings/stats/${req.params.businessId}`);
    
    try {
        const businessId = parseInt(req.params.businessId);
        const { date_from, date_to } = req.query;
        
        if (isNaN(businessId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid business ID'
            } as ApiResponse<void>);
        }
        
        const stats = await BookingService.getBookingStats(
            businessId,
            date_from?.toString(),
            date_to?.toString()
        );
        
        if (!stats) {
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve statistics'
            } as ApiResponse<void>);
        }
        
        res.json({
            success: true,
            data: stats,
            message: 'Booking statistics retrieved successfully'
        } as ApiResponse<any>);
        
        console.log(`Response sent | Statistics for business ${businessId}`);
        
    } catch (error) {
        console.error('Get booking stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve booking statistics',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

export default router;