// backend/src/services/availabilityService.ts
import { RowDataPacket } from 'mysql2/promise';
import { createDatabaseConnection } from '../config/database';
import { 
    TimeSlot, 
    DayAvailability, 
    Service,
    AvailabilityRule,
    SpecialAvailability,
    Booking
} from '../types';

export class AvailabilityService {
    
    /**
     * Generate time slots between start and end time
     */
    static generateTimeSlots(
        startTime: string, 
        endTime: string, 
        duration: number, 
        bufferAfter: number = 0
    ): TimeSlot[] {
        const slots: TimeSlot[] = [];
        
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        const slotDuration = duration + bufferAfter;
        
        for (let currentMinutes = startTotalMinutes; 
             currentMinutes + duration <= endTotalMinutes; 
             currentMinutes += slotDuration) {
            
            const slotStartHour = Math.floor(currentMinutes / 60);
            const slotStartMinute = currentMinutes % 60;
            
            const slotEndMinutes = currentMinutes + duration;
            const slotEndHour = Math.floor(slotEndMinutes / 60);
            const slotEndMinuteRemainder = slotEndMinutes % 60;
            
            const startTimeStr = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMinute.toString().padStart(2, '0')}`;
            const endTimeStr = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMinuteRemainder.toString().padStart(2, '0')}`;
            
            slots.push({
                start_time: startTimeStr,
                end_time: endTimeStr,
                available: true
            });
        }
        
        return slots;
    }

    /**
     * Convert time string (HH:MM) to minutes
     */
    static timeStringToMinutes(timeStr: string): number {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Check if two time slots overlap
     */
    static timeSlotsOverlap(
        slot1Start: string, 
        slot1End: string, 
        slot2Start: string, 
        slot2End: string
    ): boolean {
        const slot1StartMinutes = this.timeStringToMinutes(slot1Start);
        const slot1EndMinutes = this.timeStringToMinutes(slot1End);
        const slot2StartMinutes = this.timeStringToMinutes(slot2Start);
        const slot2EndMinutes = this.timeStringToMinutes(slot2End);
        
        return slot1StartMinutes < slot2EndMinutes && slot2StartMinutes < slot1EndMinutes;
    }

    /**
     * Check if a specific time slot is available for booking
     */
    static async isTimeSlotAvailable(
        businessId: number,
        serviceId: number,
        staffMemberId: number | null,
        date: string,
        startTime: string,
        endTime: string,
        partySize: number = 1,
        excludeBookingId?: number
    ): Promise<{ available: boolean; reason?: string }> {
        
        try {
            const db = await createDatabaseConnection();
            
            // Get service details
            const [services] = await db.execute<RowDataPacket[]>(
                'SELECT duration_minutes, requires_staff, capacity FROM services WHERE id = ? AND business_id = ? AND is_active = true',
                [serviceId, businessId]
            );
            
            if (services.length === 0) {
                return { available: false, reason: 'Service not found or inactive' };
            }
            
            const service = services[0] as Pick<Service, 'duration_minutes' | 'requires_staff' | 'capacity'>;
            
            // Check capacity
            if (partySize > service.capacity) {
                return { available: false, reason: `Party size exceeds capacity (max: ${service.capacity})` };
            }
            
            const requestedDate = new Date(date);
            const dayOfWeek = requestedDate.getDay();
            
            // Check availability rules
            if (service.requires_staff && staffMemberId) {
                // Check staff availability for this day
                const [staffRules] = await db.execute<RowDataPacket[]>(
                    'SELECT start_time, end_time FROM availability_rules WHERE staff_member_id = ? AND day_of_week = ? AND is_active = true',
                    [staffMemberId, dayOfWeek]
                );
                
                if (staffRules.length === 0) {
                    return { available: false, reason: 'Staff not available on this day' };
                }
                
                // Check if requested time is within staff hours
                const isWithinStaffHours = staffRules.some((rule: any) => 
                    this.timeStringToMinutes(startTime) >= this.timeStringToMinutes(rule.start_time) &&
                    this.timeStringToMinutes(endTime) <= this.timeStringToMinutes(rule.end_time)
                );
                
                if (!isWithinStaffHours) {
                    return { available: false, reason: 'Requested time is outside staff working hours' };
                }
            } else {
                // Check business availability for this day
                const [businessRules] = await db.execute<RowDataPacket[]>(
                    'SELECT start_time, end_time FROM availability_rules WHERE business_id = ? AND day_of_week = ? AND is_active = true',
                    [businessId, dayOfWeek]
                );
                
                if (businessRules.length === 0) {
                    return { available: false, reason: 'Business closed on this day' };
                }
                
                // Check if requested time is within business hours
                const isWithinBusinessHours = businessRules.some((rule: any) => 
                    this.timeStringToMinutes(startTime) >= this.timeStringToMinutes(rule.start_time) &&
                    this.timeStringToMinutes(endTime) <= this.timeStringToMinutes(rule.end_time)
                );
                
                if (!isWithinBusinessHours) {
                    return { available: false, reason: 'Requested time is outside business hours' };
                }
            }
            
            // Check special availability (closures, holidays)
            const [specialAvailability] = await db.execute<RowDataPacket[]>(
                `SELECT start_time, end_time, is_available, reason
                 FROM special_availability 
                 WHERE (business_id = ? ${staffMemberId ? 'OR staff_member_id = ?' : ''}) AND date = ?`,
                staffMemberId ? [businessId, staffMemberId, date] : [businessId, date]
            );
            
            for (const special of specialAvailability) {
                if (!special.is_available) {
                    if (special.start_time && special.end_time) {
                        // Partial day closure
                        if (this.timeSlotsOverlap(startTime, endTime, special.start_time, special.end_time)) {
                            return { available: false, reason: special.reason || 'Special closure during requested time' };
                        }
                    } else {
                        // Full day closure
                        return { available: false, reason: special.reason || 'Business/staff not available on this date' };
                    }
                }
            }
            
            // Check existing bookings for conflicts
            let conflictQuery = `
                SELECT id, start_time, end_time, party_size, status
                FROM bookings 
                WHERE business_id = ? AND service_id = ? AND booking_date = ?
                AND status IN ('confirmed', 'pending')
            `;
            
            let conflictParams: any[] = [businessId, serviceId, date];
            
            // For staff services, check same staff conflicts
            if (service.requires_staff && staffMemberId) {
                conflictQuery += ' AND staff_member_id = ?';
                conflictParams.push(staffMemberId);
            }
            
            // Exclude current booking for updates
            if (excludeBookingId) {
                conflictQuery += ' AND id != ?';
                conflictParams.push(excludeBookingId);
            }
            
            const [existingBookings] = await db.execute<RowDataPacket[]>(conflictQuery, conflictParams);
            
            // Check for time conflicts
            for (const booking of existingBookings) {
                if (this.timeSlotsOverlap(startTime, endTime, booking.start_time, booking.end_time)) {
                    // For capacity-based services, check if we can still fit
                    if (!service.requires_staff && partySize + booking.party_size <= service.capacity) {
                        continue; // This booking can share the time slot
                    }
                    return { available: false, reason: 'Time slot already booked' };
                }
            }
            
            return { available: true };
            
        } catch (error) {
            console.error('Error checking availability:', error);
            return { available: false, reason: 'Error checking availability' };
        }
    }

    /**
     * Get all available time slots for a service on a specific date
     */
    static async getAvailableSlots(
        businessId: number,
        serviceId: number,
        date: string
    ): Promise<DayAvailability> {
        
        const db = await createDatabaseConnection();
        const requestedDate = new Date(date);
        const dayOfWeek = requestedDate.getDay();
        
        // Get service details
        const [services] = await db.execute<RowDataPacket[]>(
            'SELECT id, duration_minutes, requires_staff, buffer_after_minutes, capacity FROM services WHERE id = ? AND business_id = ? AND is_active = true',
            [serviceId, businessId]
        );
        
        if (services.length === 0) {
            throw new Error('Service not found');
        }
        
        const service = services[0] as Service;
        let availableSlots: TimeSlot[] = [];
        
        if (service.requires_staff) {
            // Get all staff members who can perform this service
            const [staffServices] = await db.execute<RowDataPacket[]>(
                `SELECT sm.id as staff_id, sm.name as staff_name
                 FROM staff_services ss
                 JOIN staff_members sm ON ss.staff_member_id = sm.id
                 WHERE ss.service_id = ? AND sm.is_active = true`,
                [serviceId]
            );
            
            // Generate slots for each available staff member
            for (const staffMember of staffServices) {
                const staffId = staffMember.staff_id;
                
                // Get staff availability rules for this day
                const [staffRules] = await db.execute<RowDataPacket[]>(
                    'SELECT start_time, end_time FROM availability_rules WHERE staff_member_id = ? AND day_of_week = ? AND is_active = true',
                    [staffId, dayOfWeek]
                );
                
                // Generate time slots for each availability rule
                for (const rule of staffRules) {
                    const staffSlots = this.generateTimeSlots(
                        rule.start_time, 
                        rule.end_time, 
                        service.duration_minutes,
                        service.buffer_after_minutes || 0
                    );
                    
                    // Add staff_member_id to each slot
                    const slotsWithStaff = staffSlots.map(slot => ({
                        ...slot,
                        staff_member_id: staffId
                    }));
                    
                    availableSlots.push(...slotsWithStaff);
                }
            }
        } else {
            // Business-level service (like restaurant tables)
            const [businessRules] = await db.execute<RowDataPacket[]>(
                'SELECT start_time, end_time FROM availability_rules WHERE business_id = ? AND day_of_week = ? AND is_active = true',
                [businessId, dayOfWeek]
            );
            
            // Generate time slots for each business availability rule
            for (const rule of businessRules) {
                const businessSlots = this.generateTimeSlots(
                    rule.start_time, 
                    rule.end_time, 
                    service.duration_minutes,
                    service.buffer_after_minutes || 0
                );
                
                availableSlots.push(...businessSlots);
            }
        }
        
        // Apply special availability rules (closures/holidays)
        const [specialAvailability] = await db.execute<RowDataPacket[]>(
            `SELECT start_time, end_time, is_available, reason
             FROM special_availability 
             WHERE (business_id = ? ${service.requires_staff ? 'OR staff_member_id IN (SELECT staff_member_id FROM staff_services WHERE service_id = ?)' : ''}) 
             AND date = ?`,
            service.requires_staff ? [businessId, serviceId, date] : [businessId, date]
        );
        
        // Filter out slots during special closures
        if (specialAvailability.length > 0) {
            for (const special of specialAvailability) {
                if (!special.is_available) {
                    if (special.start_time && special.end_time) {
                        // Partial closure
                        availableSlots = availableSlots.filter(slot => 
                            !this.timeSlotsOverlap(slot.start_time, slot.end_time, special.start_time, special.end_time)
                        );
                    } else {
                        // Full day closure
                        availableSlots = [];
                        break;
                    }
                }
            }
        }
        
        // Check existing bookings and mark unavailable slots
        const [existingBookings] = await db.execute<RowDataPacket[]>(
            `SELECT start_time, end_time, staff_member_id, party_size
             FROM bookings 
             WHERE business_id = ? AND service_id = ? AND booking_date = ? 
             AND status IN ('confirmed', 'pending')`,
            [businessId, serviceId, date]
        );
        
        // Mark conflicting slots as unavailable
        availableSlots = availableSlots.map(slot => {
            for (const booking of existingBookings) {
                const conflicts = this.timeSlotsOverlap(
                    slot.start_time, 
                    slot.end_time, 
                    booking.start_time, 
                    booking.end_time
                );
                
                if (!conflicts) continue;
                
                // For staff services, check if same staff member
                if (service.requires_staff) {
                    if (slot.staff_member_id === booking.staff_member_id) {
                        return { ...slot, available: false };
                    }
                } else {
                    // For capacity-based services, check total capacity
                    // Note: This is simplified - in reality you'd sum all overlapping bookings
                    if (booking.party_size >= service.capacity) {
                        return { ...slot, available: false };
                    }
                }
            }
            return slot;
        });
        
        // Sort slots by time and remove duplicates
        availableSlots.sort((a, b) => 
            this.timeStringToMinutes(a.start_time) - this.timeStringToMinutes(b.start_time)
        );
        
        // Remove duplicate slots (can happen with multiple staff for same time)
        const uniqueSlots = availableSlots.filter((slot, index, array) => 
            index === array.findIndex(s => 
                s.start_time === slot.start_time && 
                s.end_time === slot.end_time &&
                s.staff_member_id === slot.staff_member_id
            )
        );
        
        return {
            date: requestedDate,
            day_of_week: dayOfWeek,
            time_slots: uniqueSlots
        };
    }

    /**
     * Get business ID from slug
     */
    static async getBusinessIdFromSlug(slug: string): Promise<number | null> {
        const db = await createDatabaseConnection();
        
        const [businesses] = await db.execute<RowDataPacket[]>(
            'SELECT id FROM business WHERE booking_link_slug = ? AND is_active = true',
            [slug]
        );
        
        return businesses.length > 0 ? businesses[0].id : null;
    }

    /**
     * Get service details by ID
     */
    static async getServiceDetails(serviceId: number, businessId: number): Promise<Service | null> {
        const db = await createDatabaseConnection();
        
        const [services] = await db.execute<RowDataPacket[]>(
            `SELECT id, business_id, name, description, duration_minutes, price, capacity, 
                    requires_staff, buffer_before_minutes, buffer_after_minutes, is_active
             FROM services 
             WHERE id = ? AND business_id = ? AND is_active = true`,
            [serviceId, businessId]
        );
        
        return services.length > 0 ? services[0] as Service : null;
    }

    /**
     * Check if staff member can perform a service
     */
    static async canStaffPerformService(staffMemberId: number, serviceId: number): Promise<boolean> {
        const db = await createDatabaseConnection();
        
        const [staffServices] = await db.execute<RowDataPacket[]>(
            `SELECT ss.id FROM staff_services ss
             JOIN staff_members sm ON ss.staff_member_id = sm.id
             WHERE ss.staff_member_id = ? AND ss.service_id = ? AND sm.is_active = true`,
            [staffMemberId, serviceId]
        );
        
        return staffServices.length > 0;
    }

    /**
     * Get week availability for a service
     */
    static async getWeekAvailability(
        businessSlug: string,
        serviceId: number,
        startDate: string
    ): Promise<DayAvailability[]> {
        
        const businessId = await this.getBusinessIdFromSlug(businessSlug);
        if (!businessId) {
            throw new Error('Business not found');
        }
        
        const weekAvailability: DayAvailability[] = [];
        const start = new Date(startDate);
        
        // Get 7 days of availability
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + i);
            const dateString = currentDate.toISOString().split('T')[0];
            
            try {
                const dayAvailability = await this.getAvailableSlots(businessId, serviceId, dateString);
                weekAvailability.push(dayAvailability);
            } catch (error) {
                console.error(`Error getting availability for ${dateString}:`, error);
                // Add empty day on error
                weekAvailability.push({
                    date: currentDate,
                    day_of_week: currentDate.getDay(),
                    time_slots: []
                });
            }
        }
        
        return weekAvailability;
    }

    /**
     * Validate booking request against availability
     */
    static async validateBookingRequest(
        businessId: number,
        serviceId: number,
        staffMemberId: number | null,
        bookingDate: string,
        startTime: string,
        endTime: string,
        partySize: number,
        excludeBookingId?: number
    ): Promise<{ valid: boolean; errors: string[] }> {
        
        const errors: string[] = [];
        
        try {
            // Basic time format validation
            if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime) || 
                !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
                errors.push('Invalid time format. Use HH:MM');
            }
            
            // Check if end time is after start time
            if (this.timeStringToMinutes(endTime) <= this.timeStringToMinutes(startTime)) {
                errors.push('End time must be after start time');
            }
            
            // Check if booking date is not in the past
            const bookingDateObj = new Date(bookingDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (bookingDateObj < today) {
                errors.push('Cannot book in the past');
            }
            
            // Check service details and availability
            const service = await this.getServiceDetails(serviceId, businessId);
            if (!service) {
                errors.push('Service not found or inactive');
                return { valid: false, errors };
            }
            
            // Validate staff requirement
            if (service.requires_staff) {
                if (!staffMemberId) {
                    errors.push('Staff member is required for this service');
                } else {
                    const canPerform = await this.canStaffPerformService(staffMemberId, serviceId);
                    if (!canPerform) {
                        errors.push('Selected staff member cannot perform this service');
                    }
                }
            }
            
            // Check availability
            if (errors.length === 0) {
                const availabilityResult = await this.isTimeSlotAvailable(
                    businessId,
                    serviceId,
                    staffMemberId,
                    bookingDate,
                    startTime,
                    endTime,
                    partySize,
                    excludeBookingId
                );
                
                if (!availabilityResult.available) {
                    errors.push(availabilityResult.reason || 'Time slot not available');
                }
            }
            
        } catch (error) {
            console.error('Error validating booking:', error);
            errors.push('Error validating booking request');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}