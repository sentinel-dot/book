// backend/src/routes/book.ts - SIMPLE MVP VERSION
import express from 'express';
import { BookingService } from '../services/bookingService';
import { authenticateToken } from '../middleware/auth';
import { BookingCreateInput, BookingUpdateInput, ApiResponse } from '../types';

const router = express.Router();

// Helper function to validate email
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// =============================================================================
// PUBLIC ENDPOINTS (für Kunden)
// =============================================================================

// POST /book - Create new booking
router.post('/', async (req, res) => {
    console.log("Received request: POST /book");
    
    try {
        const bookingData: BookingCreateInput = req.body;
        
        // Basic validation
        if (!bookingData.business_id || !bookingData.service_id || !bookingData.customer_name || 
            !bookingData.customer_email || !bookingData.booking_date || !bookingData.start_time || !bookingData.end_time) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: business_id, service_id, customer_name, customer_email, booking_date, start_time, end_time'
            });
        }
        
        if (!isValidEmail(bookingData.customer_email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        
        const result = await BookingService.createBooking(bookingData);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: 'Booking failed',
                error: result.errors?.join('; ')
            });
        }
        
        res.status(201).json({
            success: true,
            data: result.data,
            message: 'Booking created successfully'
        });
        
        console.log(`✅ Booking created with ID ${result.data.booking_id}`);
        
    } catch (error) {
        console.error('❌ Create booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// GET /book/:id - Get single booking (für Kunden zum Status checken)
router.get('/:id', async (req, res) => {
    console.log(`Received request: GET /book/${req.params.id}`);
    
    try {
        const bookingId = parseInt(req.params.id);
        
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID'
            });
        }
        
        const booking = await BookingService.getBookingById(bookingId);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        res.json({
            success: true,
            data: booking,
            message: 'Booking found'
        });
        
    } catch (error) {
        console.error('❌ Get booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// DELETE /book/:id - Cancel booking (mit Email-Verification)
router.delete('/:id', async (req, res) => {
    console.log(`Received request: DELETE /book/${req.params.id}`);
    
    try {
        const bookingId = parseInt(req.params.id);
        const { customer_email, reason } = req.body;
        
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID'
            });
        }
        
        if (!customer_email) {
            return res.status(400).json({
                success: false,
                message: 'Email required for cancellation'
            });
        }
        
        const result = await BookingService.cancelBooking(bookingId, customer_email, reason);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: 'Cancellation failed',
                error: result.errors?.join('; ')
            });
        }
        
        res.json({
            success: true,
            data: result.data,
            message: 'Booking cancelled'
        });
        
    } catch (error) {
        console.error('❌ Cancel booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// =============================================================================
// PROTECTED ENDPOINTS (für Business Owner) - SUPER SIMPLE
// =============================================================================

// GET /book - Get ALL bookings (no pagination, no fancy filters)
router.get('/', authenticateToken, async (req, res) => {
    console.log("Received request: GET /book");
    
    try {
        const userId = req.user?.id;
        
        // Einfachste Version - alle Buchungen ohne Filter
        const result = await BookingService.getBookings(userId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get bookings'
            });
        }
        
        res.json({
            success: true,
            data: result.data,
            message: `Found ${result.data?.length || 0} bookings`
        });
        
    } catch (error) {
        console.error('❌ Get bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// PUT /book/:id - Update booking (nur für Business Owner)
router.put('/:id', authenticateToken, async (req, res) => {
    console.log(`Received request: PUT /book/${req.params.id}`);
    
    try {
        const bookingId = parseInt(req.params.id);
        const updates: BookingUpdateInput = req.body;
        
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID'
            });
        }
        
        const result = await BookingService.updateBooking(bookingId, updates);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: 'Update failed',
                error: result.errors?.join('; ')
            });
        }
        
        res.json({
            success: true,
            data: result.data,
            message: 'Booking updated'
        });
        
    } catch (error) {
        console.error('❌ Update booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

export default router;