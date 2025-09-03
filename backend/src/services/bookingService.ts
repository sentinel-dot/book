// backend/src/services/bookingService.ts - SIMPLE MVP VERSION
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { createDatabaseConnection } from '../config/database';
import { AvailabilityService } from './availabilityService';
import { DatabaseUtils } from '../utils/database';
import { 
    BookingCreateInput, 
    BookingUpdateInput
} from '../types';

export class BookingService {

    // Define allowed fields for booking updates
    private static readonly ALLOWED_UPDATE_FIELDS = [
        'customer_name', 'customer_email', 'customer_phone', 'booking_date',
        'start_time', 'end_time', 'party_size', 'special_requests', 'status',
        'payment_status', 'cancellation_reason'
    ];

    /**
     * Create a new booking with validation
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
            
            // Check if business exists and is active
            const [businesses] = await db.execute<RowDataPacket[]>(
                'SELECT id, name, require_phone FROM business WHERE id = ? AND is_active = true',
                [business_id]
            );
            
            if (businesses.length === 0) {
                return { success: false, errors: ['Business not found'] };
            }
            
            const business = businesses[0];
            
            // Check phone requirement
            if (business.require_phone && !customer_phone) {
                return { success: false, errors: ['Phone number required'] };
            }
            
            // Validate availability (simplified)
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
            
            // Get service details for price
            const service = await AvailabilityService.getServiceDetails(service_id, business_id);
            if (!service) {
                return { success: false, errors: ['Service not found'] };
            }
            
            const total_amount = service.price ? service.price * party_size : null;
            
            // Create booking
            const [result] = await db.execute<ResultSetHeader>(
                `INSERT INTO bookings (
                    business_id, service_id, staff_member_id, customer_name, customer_email, 
                    customer_phone, booking_date, start_time, end_time, party_size, 
                    special_requests, total_amount, status, payment_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
                [
                    business_id, service_id, staff_member_id || null, customer_name, customer_email,
                    customer_phone || null, booking_date, start_time, end_time, party_size,
                    special_requests || null, total_amount
                ]
            );
            
            // Get created booking details
            const booking = await this.getBookingById(result.insertId);
            
            return { 
                success: true, 
                data: {
                    booking_id: result.insertId,
                    ...booking
                }
            };
            
        } catch (error) {
            console.error('❌ Create booking error:', error);
            return { success: false, errors: ['Failed to create booking'] };
        }
    }

    /**
     * Get booking by ID with details
     */
    static async getBookingById(bookingId: number): Promise<any | null> {
        try {
            const db = await createDatabaseConnection();
            
            const [bookings] = await db.execute<RowDataPacket[]>(
                `SELECT 
                    b.id, b.business_id, b.service_id, b.staff_member_id, b.customer_name,
                    b.customer_email, b.customer_phone, b.booking_date, b.start_time, b.end_time,
                    b.party_size, b.special_requests, b.status, b.total_amount, b.deposit_paid,
                    b.payment_status, b.cancellation_reason, b.created_at, b.updated_at,
                    bus.name as business_name, bus.phone as business_phone, bus.cancellation_hours,
                    s.name as service_name, s.duration_minutes, s.price as service_price,
                    sm.name as staff_name
                 FROM bookings b
                 JOIN business bus ON b.business_id = bus.id
                 JOIN services s ON b.service_id = s.id
                 LEFT JOIN staff_members sm ON b.staff_member_id = sm.id
                 WHERE b.id = ?`,
                [bookingId]
            );
            
            return bookings.length > 0 ? bookings[0] : null;
            
        } catch (error) {
            console.error('❌ Get booking error:', error);
            return null;
        }
    }

    /**
     * Get all bookings for a user (simple version - no pagination)
     */
    static async getBookings(userId?: number): Promise<{ success: boolean; data?: any[]; errors?: string[] }> {
        try {
            const db = await createDatabaseConnection();
            
            let query = `
                SELECT 
                    b.id, b.customer_name, b.customer_email, b.booking_date, b.start_time, b.end_time,
                    b.party_size, b.status, b.total_amount, b.created_at,
                    bus.name as business_name,
                    s.name as service_name,
                    sm.name as staff_name
                FROM bookings b
                JOIN business bus ON b.business_id = bus.id
                JOIN services s ON b.service_id = s.id
                LEFT JOIN staff_members sm ON b.staff_member_id = sm.id
            `;
            
            let params: any[] = [];
            
            // If user is provided, filter by their businesses
            if (userId) {
                query += ` 
                WHERE b.business_id IN (
                    SELECT business_id FROM user_business WHERE user_id = ?
                )`;
                params.push(userId);
            }
            
            query += ' ORDER BY b.booking_date DESC, b.start_time DESC LIMIT 100';
            
            const [bookings] = await db.execute<RowDataPacket[]>(query, params);
            
            return {
                success: true,
                data: bookings
            };
            
        } catch (error) {
            console.error('❌ Get bookings error:', error);
            return { success: false, errors: ['Failed to get bookings'] };
        }
    }

    /**
     * Update booking (simple version)
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
                    bookingId // exclude current booking
                );
                
                if (!validation.valid) {
                    return { success: false, errors: validation.errors };
                }
            }
            
            // Build update query - simple version
            const updateFields: string[] = [];
            const updateValues: any[] = [];
            
            for (const field of this.ALLOWED_UPDATE_FIELDS) {
                if (updates[field as keyof BookingUpdateInput] !== undefined) {
                    updateFields.push(`${field} = ?`);
                    updateValues.push(updates[field as keyof BookingUpdateInput]);
                }
            }
            
            if (updateFields.length === 0) {
                return { success: false, errors: ['No fields to update'] };
            }
            
            // Add cancellation timestamp if status changed to cancelled
            if (updates.status === 'cancelled' && existingBooking.status !== 'cancelled') {
                updateFields.push('cancelled_at = NOW()');
            }
            
            // Always update timestamp
            updateFields.push('updated_at = NOW()');
            updateValues.push(bookingId);
            
            // Execute update
            await db.execute(
                `UPDATE bookings SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );
            
            // Get updated booking
            const updatedBooking = await this.getBookingById(bookingId);
            
            return { success: true, data: updatedBooking };
            
        } catch (error) {
            console.error('❌ Update booking error:', error);
            return { success: false, errors: ['Failed to update booking'] };
        }
    }

    /**
     * Cancel booking with email verification
     */
    static async cancelBooking(
        bookingId: number, 
        customerEmail: string, 
        reason?: string
    ): Promise<{ success: boolean; data?: any; errors?: string[] }> {
        
        try {
            // Get booking
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
                return { success: false, errors: ['Booking already cancelled'] };
            }
            
            // Simple cancellation policy check (24 hours default)
            const bookingDateTime = new Date(`${booking.booking_date} ${booking.start_time}`);
            const now = new Date();
            const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            
            const cancellationHours = booking.cancellation_hours || 24;
            if (hoursUntilBooking < cancellationHours) {
                return { 
                    success: false, 
                    errors: [`Must cancel at least ${cancellationHours} hours before booking`] 
                };
            }
            
            // Cancel booking
            const updateResult = await this.updateBooking(bookingId, {
                status: 'cancelled',
                cancellation_reason: reason || 'Customer cancellation'
            });
            
            return updateResult;
            
        } catch (error) {
            console.error('❌ Cancel booking error:', error);
            return { success: false, errors: ['Failed to cancel booking'] };
        }
    }

    /**
     * Send confirmation (placeholder)
     */
    static async sendConfirmation(bookingId: number): Promise<boolean> {
        try {
            const db = await createDatabaseConnection();
            
            // Mark confirmation as sent
            await db.execute(
                'UPDATE bookings SET confirmation_sent_at = NOW() WHERE id = ?',
                [bookingId]
            );
            
            console.log(`📧 Confirmation sent for booking ${bookingId}`);
            return true;
            
        } catch (error) {
            console.error('❌ Send confirmation error:', error);
            return false;
        }
    }
}