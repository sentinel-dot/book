// Types for the different database tables

// Backend Types for Database Entities
// Generated from backend/src/config/schema.sql

export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: 'owner' | 'manager' | 'staff';
  is_active: boolean;
  email_verified: boolean;
  email_verification_token?: string;
  reset_password_token?: string;
  reset_password_expires?: Date;
  last_login?: Date;
  login_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreateInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: 'owner' | 'manager' | 'staff';
}

export interface UserUpdateInput {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: 'owner' | 'manager' | 'staff';
  is_active?: boolean;
  email_verified?: boolean;
}

export interface Business {
  id: number;
  name: string;
  type: 'restaurant' | 'hair_salon' | 'beauty_salon' | 'massage' | 'other';
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country: string;
  description?: string;
  website_url?: string;
  instagram_handle?: string;
  booking_link_slug: string;
  booking_advance_days: number;
  cancellation_hours: number;
  require_phone: boolean;
  require_deposit: boolean;
  deposit_amount?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BusinessCreateInput {
  name: string;
  type: 'restaurant' | 'hair_salon' | 'beauty_salon' | 'massage' | 'other';
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  description?: string;
  website_url?: string;
  instagram_handle?: string;
  booking_link_slug: string;
  booking_advance_days?: number;
  cancellation_hours?: number;
  require_phone?: boolean;
  require_deposit?: boolean;
  deposit_amount?: number;
}

export interface BusinessUpdateInput {
  name?: string;
  type?: 'restaurant' | 'hair_salon' | 'beauty_salon' | 'massage' | 'other';
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  description?: string;
  website_url?: string;
  instagram_handle?: string;
  booking_advance_days?: number;
  cancellation_hours?: number;
  require_phone?: boolean;
  require_deposit?: boolean;
  deposit_amount?: number;
  is_active?: boolean;
}

export interface UserBusiness {
  id: number;
  user_id: number;
  business_id: number;
  role: 'owner' | 'manager' | 'staff';
  permissions: Record<string, any>;
  created_at: Date;
}

export interface StaffMember {
  id: number;
  business_id: number;
  name: string;
  email?: string;
  phone?: string;
  description?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StaffMemberCreateInput {
  business_id: number;
  name: string;
  email?: string;
  phone?: string;
  description?: string;
  avatar_url?: string;
}

export interface StaffMemberUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
  description?: string;
  avatar_url?: string;
  is_active?: boolean;
}

export interface Service {
  id: number;
  business_id: number;
  name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
  capacity: number;
  requires_staff: boolean;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ServiceCreateInput {
  business_id: number;
  name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
  capacity?: number;
  requires_staff?: boolean;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
}

export interface ServiceUpdateInput {
  name?: string;
  description?: string;
  duration_minutes?: number;
  price?: number;
  capacity?: number;
  requires_staff?: boolean;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  is_active?: boolean;
}

export interface StaffService {
  id: number;
  staff_member_id: number;
  service_id: number;
  created_at: Date;
}

export interface AvailabilityRule {
  id: number;
  business_id?: number;
  staff_member_id?: number;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  start_time: string; // Format: "HH:MM"
  end_time: string; // Format: "HH:MM"
  is_active: boolean;
  created_at: Date;
}

export interface AvailabilityRuleCreateInput {
  business_id?: number;
  staff_member_id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface AvailabilityRuleUpdateInput {
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
}

export interface SpecialAvailability {
  id: number;
  business_id?: number;
  staff_member_id?: number;
  date: Date;
  start_time?: string;
  end_time?: string;
  is_available: boolean;
  reason?: string;
  created_at: Date;
}

export interface SpecialAvailabilityCreateInput {
  business_id?: number;
  staff_member_id?: number;
  date: Date;
  start_time?: string;
  end_time?: string;
  is_available: boolean;
  reason?: string;
}

export interface Booking {
  id: number;
  business_id: number;
  service_id: number;
  staff_member_id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: Date;
  start_time: string;
  end_time: string;
  party_size: number;
  special_requests?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  total_amount?: number;
  deposit_paid: number;
  payment_status: string;
  confirmation_sent_at?: Date;
  reminder_sent_at?: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface BookingCreateInput {
  business_id: number;
  service_id: number;
  staff_member_id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: Date;
  start_time: string;
  end_time: string;
  party_size?: number;
  special_requests?: string;
  total_amount?: number;
  deposit_paid?: number;
  payment_status?: string;
}

export interface BookingUpdateInput {
  service_id?: number;
  staff_member_id?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  booking_date?: Date;
  start_time?: string;
  end_time?: string;
  party_size?: number;
  special_requests?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  total_amount?: number;
  deposit_paid?: number;
  payment_status?: string;
  cancellation_reason?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  business_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: Date;
  booking_id?: number;
  created_at: Date;
}

export interface NotificationCreateInput {
  user_id: number;
  business_id: number;
  type: string;
  title: string;
  message: string;
  booking_id?: number;
}

// Extended types with relations
export interface BusinessWithStaff extends Business {
  staff_members: StaffMember[];
  services: Service[];
}

export interface StaffMemberWithServices extends StaffMember {
  services: Service[];
}

export interface ServiceWithStaff extends Service {
  staff_members: StaffMember[];
}

export interface BookingWithDetails extends Booking {
  business: Business;
  service: Service;
  staff_member?: StaffMember;
}

export interface UserWithBusiness extends User {
  businesses: Business[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  token: string;
  refreshToken?: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirm {
  token: string;
  password: string;
}


export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

// Time slot types
export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
  staff_member_id?: number;
}

export interface DayAvailability {
  date: Date;
  day_of_week: number;
  time_slots: TimeSlot[];
}

export interface AvailabilityRuleCreateInput {
  business_id?: number;
  staff_member_id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface AvailabilityRuleUpdateInput {
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
}

export interface SpecialAvailability {
  id: number;
  business_id?: number;
  staff_member_id?: number;
  date: Date;
  start_time?: string;
  end_time?: string;
  is_available: boolean;
  reason?: string;
  created_at: Date;
}

export interface SpecialAvailabilityCreateInput {
  business_id?: number;
  staff_member_id?: number;
  date: Date;
  start_time?: string;
  end_time?: string;
  is_available: boolean;
  reason?: string;
}

export interface Booking {
  id: number;
  business_id: number;
  service_id: number;
  staff_member_id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: Date;
  start_time: string;
  end_time: string;
  party_size: number;
  special_requests?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  total_amount?: number;
  deposit_paid: number;
  payment_status: string;
  confirmation_sent_at?: Date;
  reminder_sent_at?: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface BookingCreateInput {
  business_id: number;
  service_id: number;
  staff_member_id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: Date;
  start_time: string;
  end_time: string;
  party_size?: number;
  special_requests?: string;
  total_amount?: number;
  deposit_paid?: number;
  payment_status?: string;
}

export interface BookingUpdateInput {
  service_id?: number;
  staff_member_id?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  booking_date?: Date;
  start_time?: string;
  end_time?: string;
  party_size?: number;
  special_requests?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  total_amount?: number;
  deposit_paid?: number;
  payment_status?: string;
  cancellation_reason?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  business_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: Date;
  booking_id?: number;
  created_at: Date;
}

export interface NotificationCreateInput {
  user_id: number;
  business_id: number;
  type: string;
  title: string;
  message: string;
  booking_id?: number;
}

// Extended types with relations
export interface BusinessWithStaff extends Business {
  staff_members: StaffMember[];
  services: Service[];
}

export interface StaffMemberWithServices extends StaffMember {
  services: Service[];
}

export interface ServiceWithStaff extends Service {
  staff_members: StaffMember[];
}

export interface BookingWithDetails extends Booking {
  business: Business;
  service: Service;
  staff_member?: StaffMember;
}

export interface UserWithBusiness extends User {
  businesses: Business[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  token: string;
  refreshToken?: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirm {
  token: string;
  password: string;
}

// Query types
export interface BookingQuery {
  business_id?: number;
  staff_member_id?: number;
  service_id?: number;
  date_from?: Date;
  date_to?: Date;
  status?: string;
  customer_email?: string;
  page?: number;
  limit?: number;
}

export interface AvailabilityQuery {
  business_id?: number;
  staff_member_id?: number;
  date: Date;
  service_id?: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

// Time slot types
export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
  staff_member_id?: number;
}

export interface DayAvailability {
  date: Date;
  day_of_week: number;
  time_slots: TimeSlot[];
}