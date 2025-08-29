// backend/src/services/bookingService.ts
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { createDatabaseConnection } from '../config/database';
import { AvailabilityService } from './availabilityService';
import { DatabaseUtils } from '../utils/database';
import { 
    Booking, 
    BookingCreateInput, 
    BookingUpdateInput,
    BookingQuery,
    Service,
    Business
} from '../types';

export class BookingService {

    // Define allowed fields for booking updates
    private static readonly ALLOWED_UPDATE_FIELDS = [
        'customer_name', 'customer_email', 'customer_phone', 'booking_date',
        'start_time', 'end_time', 'party_size', 'special_requests', 'status',
        'payment_status', 'cancellation_reason', 'total_amount', 'deposit_paid'
    ];

    /**
     * Create a new booking with full validation
     */
    static async createBooking(bookingData: BookingCreateInput): Promise<{ success: boolean; data?: any; errors?: string[] }> {
        try {
            const {
                business_id,
                service_id,
                staff_member_id,
                customer_name,
                customer_email,
                customer_phone,
                booking_date,
                start_time,
                end_time,
                party_size = 1,
                special_requests
            } = bookingData;

            const db = await createDatabaseConnection();
            
            // Validate business exists and get requirements
            const [businesses] = await db.execute<RowDataPacket[]>(
                'SELECT id, name, require_phone, require_deposit, deposit_amount FROM business WHERE id = ? AND is_active = true',
                [business_id]
            );
            
            if (businesses.length === 0) {
                return { success: false, errors: ['Business not found or inactive'] };
            }
            
            const business = businesses[0];
            
            // Check phone requirement
            if (business.require_phone && !customer_phone) {
                return { success: false, errors: ['Phone number is required for this business'] };
            }
            
            // Validate booking using AvailabilityService
            const validation = await AvailabilityService.validateBookingRequest(
                business_id,
                service_id,
                staff_member_id || null,
                booking_date.toString(),
                start_time,
                end_time,
                party_size
            );
            
            if (!validation.valid) {
                return { success: false, errors: validation.errors };
            }
            
            // Get service for price calculation
            const service = await AvailabilityService.getServiceDetails(service_id, business_id);
            if (!service) {
                return { success: false, errors: ['Service not found'] };
            }
            
            // Calculate total amount
            const total_amount = service.price ? service.price * party_size : null;
            
            // Create booking
            const [result] = await db.execute<ResultSetHeader>(
                `INSERT INTO bookings (
                    business_id, service_id, staff_member_id, customer_name, customer_email, 
                    customer_phone, booking_date, start_time, end_time, party_size, 
                    special_requests, total_amount, status, payment_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
                DatabaseUtils.sanitizeArrayForMySQL([
                    business_id, service_id, staff_member_id, customer_name, customer_email,
                    customer_phone, booking_date, start_time, end_time, party_size,
                    special_requests, total_amount
                ])
            );
            
            // Get created booking with full details
            const bookingDetails = await this.getBookingById(result.insertId);
            
            return { 
                success: true, 
                data: {
                    ...bookingDetails,
                    booking_id: result.insertId
                }
            };
            
        } catch (error) {
            console.error('Create booking service error:', error);
            return { success: false, errors: ['Failed to create booking'] };
        }
    }

    /**
     * Get booking by ID with full details
     */
    static async getBookingById(bookingId: number): Promise<any | null> {
        try {
            const db = await createDatabaseConnection();
            
            const [bookings] = await db.execute<RowDataPacket[]>(
                `SELECT 
                    b.id, b.business_id, b.service_id, b.staff_member_id, b.customer_name,
                    b.customer_email, b.customer_phone, b.booking_date, b.start_time, b.end_time,
                    b.party_size, b.special_requests, b.status, b.total_amount, b.deposit_paid,
                    b.payment_status, b.confirmation_sent_at, b.reminder_sent_at, b.cancelled_at,
                    b.cancellation_reason, b.created_at, b.updated_at,
                    bus.name as business_name, bus.email as business_email, bus.phone as business_phone,
                    bus.address, bus.city, bus.postal_code, bus.cancellation_hours,
                    s.name as service_name, s.duration_minutes, s.price as service_price,
                    sm.name as staff_name, sm.email as staff_email
                 FROM bookings b
                 JOIN business bus ON b.business_id = bus.id
                 JOIN services s ON b.service_id = s.id
                 LEFT JOIN staff_members sm ON b.staff_member_id = sm.id
                 WHERE b.id = ?`,
                [bookingId]
            );
            
            return bookings.length > 0 ? bookings[0] : null;
            
        } catch (error) {
            console.error('Get booking by ID error:', error);
            return null;
        }
    }

    /**
     * Update booking with validation
     */
    static async updateBooking(
        bookingId: number, 
        updates: BookingUpdateInput
    ): Promise<{ success: boolean; data?: any; errors?: string[] }> {
        
        try {
            const db = await createDatabaseConnection();
            
            // Get existing booking
            const existingBooking = await this.getBookingById(bookingId);
            if (!existingBooking) {
                return { success: false, errors: ['Booking not found'] };
            }
            
            // If time/date is being changed, validate availability
            if (updates.booking_date || updates.start_time || updates.end_time || updates.party_size) {
                const newDate = (updates.booking_date || existingBooking.booking_date).toString();
                const newStartTime = updates.start_time || existingBooking.start_time;
                const newEndTime = updates.end_time || existingBooking.end_time;
                const newPartySize = updates.party_size || existingBooking.party_size;
                
                const validation = await AvailabilityService.validateBookingRequest(
                    existingBooking.business_id,
                    existingBooking.service_id,
                    existingBooking.staff_member_id,
                    newDate,
                    newStartTime,
                    newEndTime,
                    newPartySize,
                    bookingId
                );
                
                if (!validation.valid) {
                    return { success: false, errors: validation.errors };
                }
            }
            
            // Build update query using DatabaseUtils
            const { setClause, params: updateParams } = DatabaseUtils.buildUpdateClause(
                updates,
                BookingService.ALLOWED_UPDATE_FIELDS
            );
            
            if (!setClause) {
                return { success: false, errors: ['No valid fields to update'] };
            }
            
            // Add timestamp for cancellation
            let finalSetClause = setClause;
            let finalParams = [...updateParams];
            
            if (updates.status === 'cancelled' && existingBooking.status !== 'cancelled') {
                finalSetClause += ', cancelled_at = NOW()';
            }
            
            // Always update timestamp
            finalSetClause += ', updated_at = NOW()';
            finalParams.push(bookingId);
            
            // Execute update
            await db.execute(
                `UPDATE bookings SET ${finalSetClause} WHERE id = ?`,
                finalParams
            );
            
            // Get updated booking
            const updatedBooking = await this.getBookingById(bookingId);
            
            return { success: true, data: updatedBooking };
            
        } catch (error) {
            console.error('Update booking service error:', error);
            return { success: false, errors: ['Failed to update booking'] };
        }
    }

    /**
     * Cancel booking with email verification and cancellation policy check
     */
    static async cancelBooking(
        bookingId: number, 
        customerEmail: string, 
        reason?: string
    ): Promise<{ success: boolean; data?: any; errors?: string[] }> {
        
        try {
            const db = await createDatabaseConnection();
            
            // Get booking with business details
            const booking = await this.getBookingById(bookingId);
            if (!booking) {
                return { success: false, errors: ['Booking not found'] };
            }
            
            // Verify email matches
            if (booking.customer_email.toLowerCase() !== customerEmail.toLowerCase()) {
                return { success: false, errors: ['Email does not match booking'] };
            }
            
            // Check if already cancelled
            if (booking.status === 'cancelled') {
                return { success: false, errors: ['Booking is already cancelled'] };
            }
            
            // Check cancellation policy (using business cancellation_hours)
            const bookingDateTime = new Date(`${booking.booking_date} ${booking.start_time}`);
            const now = new Date();
            const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            
            const cancellationHours = booking.cancellation_hours || 24;
            if (hoursUntilBooking < cancellationHours) {
                return { 
                    success: false, 
                    errors: [`Cancellation must be made at least ${cancellationHours} hours before the booking`] 
                };
            }
            
            // Cancel booking
            const updateResult = await this.updateBooking(bookingId, {
                status: 'cancelled',
                cancellation_reason: reason || 'Customer cancellation'
            });
            
            return updateResult;
            
        } catch (error) {
            console.error('Cancel booking service error:', error);
            return { success: false, errors: ['Failed to cancel booking'] };
        }
    }

    /**
     * Get bookings with filters and pagination
     */
    static async getBookings(
        filters: BookingQuery = {},
        userId?: number
    ): Promise<{ success: boolean; data?: any[]; pagination?: any; errors?: string[] }> {
        
        try {
            const {
                business_id,
                staff_member_id,
                service_id,
                date_from,
                date_to,
                status,
                customer_email,
                page = 1,
                limit = 20
            } = filters;
            
            const db = await createDatabaseConnection();
            
            // Build dynamic WHERE clause
            let whereConditions = ['1=1'];
            let queryParams: any[] = [];
            
            if (business_id) {
                whereConditions.push('b.business_id = ?');
                queryParams.push(business_id);
            }
            
            if (staff_member_id) {
                whereConditions.push('b.staff_member_id = ?');
                queryParams.push(staff_member_id);
            }
            
            if (service_id) {
                whereConditions.push('b.service_id = ?');
                queryParams.push(service_id);
            }
            
            if (date_from) {
                whereConditions.push('b.booking_date >= ?');
                queryParams.push(date_from);
            }
            
            if (date_to) {
                whereConditions.push('b.booking_date <= ?');
                queryParams.push(date_to);
            }
            
            if (status) {
                whereConditions.push('b.status = ?');
                queryParams.push(status);
            }
            
            if (customer_email) {
                whereConditions.push('b.customer_email LIKE ?');
                queryParams.push(`%${customer_email}%`);
            }
            
            // Add user permission filter if needed
            if (userId) {
                whereConditions.push(`
                    b.business_id IN (
                        SELECT business_id FROM user_business WHERE user_id = ?
                    )
                `);
                queryParams.push(userId);
            }
            
            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM bookings b 
                WHERE ${whereConditions.join(' AND ')}
            `;
            
            const [countResult] = await db.execute<RowDataPacket[]>(countQuery, queryParams);
            const total = countResult[0].total;
            
            // Calculate pagination
            const pageNum = Math.max(1, parseInt(page.toString()) || 1);
            const limitNum = Math.min(100, Math.max(1, parseInt(limit.toString()) || 20));
            const offset = (pageNum - 1) * limitNum;
            const totalPages = Math.ceil(total / limitNum);
            
            // Get bookings
            const dataQuery = `
                SELECT 
                    b.id, b.business_id, b.service_id, b.staff_member_id, b.customer_name,
                    b.customer_email, b.customer_phone, b.booking_date, b.start_time, b.end_time,
                    b.party_size, b.special_requests, b.status, b.total_amount, b.deposit_paid,
                    b.payment_status, b.confirmation_sent_at, b.reminder_sent_at, b.cancelled_at,
                    b.cancellation_reason, b.created_at, b.updated_at,
                    bus.name as business_name, bus.email as business_email,
                    s.name as service_name, s.duration_minutes, s.price as service_price,
                    sm.name as staff_name, sm.email as staff_email
                FROM bookings b
                JOIN business bus ON b.business_id = bus.id
                JOIN services s ON b.service_id = s.id
                LEFT JOIN staff_members sm ON b.staff_member_id = sm.id
                WHERE ${whereConditions.join(' AND ')}
                ORDER BY b.booking_date DESC, b.start_time DESC
                LIMIT ? OFFSET ?
            `;
            
            const [bookings] = await db.execute<RowDataPacket[]>(dataQuery, [...queryParams, limitNum, offset]);
            
            return {
                success: true,
                data: bookings,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages
                }
            };
            
        } catch (error) {
            console.error('Get bookings service error:', error);
            return { success: false, errors: ['Failed to retrieve bookings'] };
        }
    }

    /**
     * Get upcoming bookings for a business (for dashboard)
     */
    static async getUpcomingBookings(businessId: number, days: number = 7): Promise<any[]> {
        try {
            const db = await createDatabaseConnection();
            
            const [bookings] = await db.execute<RowDataPacket[]>(
                `SELECT 
                    b.id, b.customer_name, b.booking_date, b.start_time, b.end_time,
                    b.party_size, b.status, s.name as service_name, sm.name as staff_name
                 FROM bookings b
                 JOIN services s ON b.service_id = s.id
                 LEFT JOIN staff_members sm ON b.staff_member_id = sm.id
                 WHERE b.business_id = ? 
                 AND b.booking_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
                 AND b.status IN ('pending', 'confirmed')
                 ORDER BY b.booking_date ASC, b.start_time ASC
                 LIMIT 20`,
                [businessId, days]
            );
            
            return bookings;
            
        } catch (error) {
            console.error('Get upcoming bookings error:', error);
            return [];
        }
    }

    /**
     * Get booking statistics for a business
     */
    static async getBookingStats(businessId: number, dateFrom?: string, dateTo?: string) {
        try {
            const db = await createDatabaseConnection();
            
            let dateCondition = '';
            let params: any[] = [businessId];
            
            if (dateFrom && dateTo) {
                dateCondition = 'AND booking_date BETWEEN ? AND ?';
                params.push(dateFrom, dateTo);
            } else {
                // Default to current month
                dateCondition = 'AND booking_date >= DATE_FORMAT(NOW(), "%Y-%m-01")';
            }
            
            // Get various statistics
            const [stats] = await db.execute<RowDataPacket[]>(
                `SELECT 
                    COUNT(*) as total_bookings,
                    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
                    COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show_bookings,
                    SUM(total_amount) as total_revenue,
                    SUM(deposit_paid) as total_deposits,
                    AVG(party_size) as avg_party_size
                 FROM bookings 
                 WHERE business_id = ? ${dateCondition}`,
                params
            );
            
            return stats[0];
            
        } catch (error) {
            console.error('Get booking stats error:', error);
            return null;
        }
    }

    /**
     * Send booking confirmation (placeholder for email service)
     */
    static async sendConfirmation(bookingId: number): Promise<boolean> {
        try {
            const db = await createDatabaseConnection();
            
            // Mark confirmation as sent
            await db.execute(
                'UPDATE bookings SET confirmation_sent_at = NOW() WHERE id = ?',
                [bookingId]
            );
            
            // TODO: Integrate with email service (SendGrid, etc.)
            console.log(`📧 Booking confirmation sent for booking ${bookingId}`);
            
            return true;
            
        } catch (error) {
            console.error('Send confirmation error:', error);
            return false;
        }
    }

    /**
     * Send booking reminder (placeholder for email service)
     */
    static async sendReminder(bookingId: number): Promise<boolean> {
        try {
            const db = await createDatabaseConnection();
            
            // Mark reminder as sent
            await db.execute(
                'UPDATE bookings SET reminder_sent_at = NOW() WHERE id = ?',
                [bookingId]
            );
            
            // TODO: Integrate with email service
            console.log(`📧 Booking reminder sent for booking ${bookingId}`);
            
            return true;
            
        } catch (error) {
            console.error('Send reminder error:', error);
            return false;
        }
    }

    /**
     * Check if it's time to send reminders
     */
    static async processReminders(): Promise<void> {
        try {
            const db = await createDatabaseConnection();
            
            // Find bookings that need reminders (24 hours before)
            const [bookingsForReminder] = await db.execute<RowDataPacket[]>(
                `SELECT id FROM bookings 
                 WHERE status = 'confirmed' 
                 AND reminder_sent_at IS NULL
                 AND TIMESTAMPDIFF(HOUR, NOW(), CONCAT(booking_date, ' ', start_time)) BETWEEN 23 AND 25`,
                []
            );
            
            for (const booking of bookingsForReminder) {
                await this.sendReminder(booking.id);
            }
            
            console.log(`Processed ${bookingsForReminder.length} booking reminders`);
            
        } catch (error) {
            console.error('Process reminders error:', error);
        }
    }
}