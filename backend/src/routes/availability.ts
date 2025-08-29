// backend/src/routes/availability.ts
import express from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { createDatabaseConnection } from '../config/database';
import { 
    TimeSlot, 
    DayAvailability, 
    AvailabilityRule, 
    SpecialAvailability, 
    Booking,
    Service,
    ApiResponse 
} from '../types';

const router = express.Router();

// Helper function to generate time slots
function generateTimeSlots(startTime: string, endTime: string, duration: number, bufferAfter: number = 0): TimeSlot[] {
    const slots: TimeSlot[] = [];
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    const slotDuration = duration + bufferAfter;
    
    for (let currentMinutes = startTotalMinutes; currentMinutes + duration <= endTotalMinutes; currentMinutes += slotDuration) {
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

// Helper function to check if two time slots overlap
function timeSlotsOverlap(slot1Start: string, slot1End: string, slot2Start: string, slot2End: string): boolean {
    const slot1StartMinutes = timeStringToMinutes(slot1Start);
    const slot1EndMinutes = timeStringToMinutes(slot1End);
    const slot2StartMinutes = timeStringToMinutes(slot2Start);
    const slot2EndMinutes = timeStringToMinutes(slot2End);
    
    return slot1StartMinutes < slot2EndMinutes && slot2StartMinutes < slot1EndMinutes;
}

// Helper function to convert time string to minutes
function timeStringToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

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
        
        const db = await createDatabaseConnection();
        
        // Get business ID from slug
        const [businesses] = await db.execute<RowDataPacket[]>(
            'SELECT id FROM business WHERE booking_link_slug = ? AND is_active = true',
            [businessSlug]
        );
        
        if (businesses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Business not found'
            } as ApiResponse<void>);
        }
        
        const businessId = businesses[0].id;
        
        // Get service details
        const [services] = await db.execute<RowDataPacket[]>(
            `SELECT id, name, duration_minutes, requires_staff, buffer_after_minutes, capacity
             FROM services 
             WHERE id = ? AND business_id = ? AND is_active = true`,
            [serviceId, businessId]
        );
        
        if (services.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            } as ApiResponse<void>);
        }
        
        const service = services[0] as Service;
        const dayOfWeek = requestedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        let availableSlots: TimeSlot[] = [];
        
        if (service.requires_staff) {
            // Service requires staff - check staff availability
            const [staffServices] = await db.execute<RowDataPacket[]>(
                `SELECT sm.id as staff_id, sm.name as staff_name
                 FROM staff_services ss
                 JOIN staff_members sm ON ss.staff_member_id = sm.id
                 WHERE ss.service_id = ? AND sm.is_active = true`,
                [serviceId]
            );
            
            if (staffServices.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        date: requestedDate,
                        day_of_week: dayOfWeek,
                        time_slots: []
                    } as DayAvailability,
                    message: 'No staff available for this service'
                } as ApiResponse<DayAvailability>);
            }
            
            // Check each staff member's availability
            for (const staffMember of staffServices) {
                const staffId = staffMember.staff_id;
                
                // Get staff availability rules for this day
                const [staffRules] = await db.execute<RowDataPacket[]>(
                    `SELECT start_time, end_time 
                     FROM availability_rules 
                     WHERE staff_member_id = ? AND day_of_week = ? AND is_active = true`,
                    [staffId, dayOfWeek]
                );
                
                if (staffRules.length === 0) continue; // Staff not available on this day
                
                // Generate time slots for this staff member
                for (const rule of staffRules) {
                    const staffSlots = generateTimeSlots(
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
            // Service doesn't require staff - check business availability
            const [businessRules] = await db.execute<RowDataPacket[]>(
                `SELECT start_time, end_time 
                 FROM availability_rules 
                 WHERE business_id = ? AND day_of_week = ? AND is_active = true`,
                [businessId, dayOfWeek]
            );
            
            if (businessRules.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        date: requestedDate,
                        day_of_week: dayOfWeek,
                        time_slots: []
                    } as DayAvailability,
                    message: 'Business not open on this day'
                } as ApiResponse<DayAvailability>);
            }
            
            // Generate time slots based on business hours
            for (const rule of businessRules) {
                const businessSlots = generateTimeSlots(
                    rule.start_time, 
                    rule.end_time, 
                    service.duration_minutes,
                    service.buffer_after_minutes || 0
                );
                availableSlots.push(...businessSlots);
            }
        }
        
        // Check for special availability (closures, holidays, etc.)
        const [specialAvailability] = await db.execute<RowDataPacket[]>(
            `SELECT start_time, end_time, is_available, reason
             FROM special_availability 
             WHERE (business_id = ? OR staff_member_id IN (
                 SELECT staff_member_id FROM staff_services WHERE service_id = ?
             )) AND date = ?`,
            [businessId, serviceId, date]
        );
        
        // Apply special availability rules
        if (specialAvailability.length > 0) {
            for (const special of specialAvailability) {
                if (!special.is_available) {
                    // Remove slots during closure periods
                    if (special.start_time && special.end_time) {
                        availableSlots = availableSlots.filter(slot => 
                            !timeSlotsOverlap(slot.start_time, slot.end_time, special.start_time, special.end_time)
                        );
                    } else {
                        // Full day closure
                        availableSlots = [];
                        break;
                    }
                }
            }
        }
        
        // Check existing bookings and mark slots as unavailable
        const [existingBookings] = await db.execute<RowDataPacket[]>(
            `SELECT start_time, end_time, staff_member_id, party_size
             FROM bookings 
             WHERE business_id = ? AND service_id = ? AND booking_date = ? 
             AND status IN ('confirmed', 'pending')`,
            [businessId, serviceId, date]
        );
        
        // Mark conflicting time slots as unavailable
        for (const booking of existingBookings) {
            availableSlots = availableSlots.map(slot => {
                // Check if this slot conflicts with existing booking
                const conflicts = timeSlotsOverlap(
                    slot.start_time, 
                    slot.end_time, 
                    booking.start_time, 
                    booking.end_time
                );
                
                // For staff services, also check if same staff member
                const sameStaff = !service.requires_staff || slot.staff_member_id === booking.staff_member_id;
                
                // For capacity-based services, check if capacity is exceeded
                const capacityExceeded = booking.party_size >= service.capacity;
                
                if (conflicts && sameStaff && capacityExceeded) {
                    return { ...slot, available: false };
                }
                
                return slot;
            });
        }
        
        // Sort slots by time
        availableSlots.sort((a, b) => timeStringToMinutes(a.start_time) - timeStringToMinutes(b.start_time));
        
        // Remove duplicate slots (can happen with multiple staff for same time)
        const uniqueSlots = availableSlots.filter((slot, index, array) => 
            index === array.findIndex(s => s.start_time === slot.start_time && s.end_time === slot.end_time)
        );
        
        const dayAvailability: DayAvailability = {
            date: requestedDate,
            day_of_week: dayOfWeek,
            time_slots: uniqueSlots
        };
        
        res.json({
            success: true,
            data: dayAvailability,
            message: `Found ${uniqueSlots.filter(s => s.available).length} available slots`
        } as ApiResponse<DayAvailability>);
        
        console.log(`Response sent | ${uniqueSlots.length} total slots, ${uniqueSlots.filter(s => s.available).length} available`);
        
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
// Get availability for a full week
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
        
        if (!service_id) {
            return res.status(400).json({
                success: false,
                message: 'Service ID parameter is required'
            } as ApiResponse<void>);
        }
        
        const startDate = new Date(date);
        const weekAvailability: DayAvailability[] = [];
        
        // Get availability for 7 days starting from the given date
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const dateString = currentDate.toISOString().split('T')[0];
            
            try {
                // Make internal request to single day endpoint
                // Note: In a real application, you'd extract the logic into a shared function
                // For now, we'll call the same logic but this is a simplified approach
                
                const dayAvailability: DayAvailability = {
                    date: currentDate,
                    day_of_week: currentDate.getDay(),
                    time_slots: [] // Would be populated by calling the single day logic
                };
                
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
        
        res.json({
            success: true,
            data: weekAvailability,
            message: `Week availability retrieved for ${businessSlug}`
        } as ApiResponse<DayAvailability[]>);
        
        console.log(`Response sent | Week availability for ${businessSlug}`);
        
    } catch (error) {
        console.error('Get week availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve week availability',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        } as ApiResponse<void>);
    }
});

export default router;