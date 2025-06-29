// Frontend Types for React Components and API Interactions
// Based on backend/src/config/schema.sql

// Core entity types (matching backend but frontend-focused)
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'owner' | 'manager' | 'staff';
  is_active: boolean;
  email_verified: boolean;
  last_login?: string;
  login_count: number;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  business_id: number;
  service_id: number;
  staff_member_id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: string; // ISO date string
  start_time: string;
  end_time: string;
  party_size: number;
  special_requests?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  total_amount?: number;
  deposit_paid: number;
  payment_status: string;
  confirmation_sent_at?: string;
  reminder_sent_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityRule {
  id: number;
  business_id?: number;
  staff_member_id?: number;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  start_time: string; // Format: "HH:MM"
  end_time: string; // Format: "HH:MM"
  is_active: boolean;
  created_at: string;
}

export interface SpecialAvailability {
  id: number;
  business_id?: number;
  staff_member_id?: number;
  date: string; // ISO date string
  start_time?: string;
  end_time?: string;
  is_available: boolean;
  reason?: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  business_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string;
  booking_id?: number;
  created_at: string;
}

// Form input types for creating/updating entities
export interface BusinessFormData {
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

export interface ServiceFormData {
  name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
  capacity?: number;
  requires_staff?: boolean;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
}

export interface StaffMemberFormData {
  name: string;
  email?: string;
  phone?: string;
  description?: string;
  avatar_url?: string;
}

export interface BookingFormData {
  service_id: number;
  staff_member_id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: string;
  start_time: string;
  party_size?: number;
  special_requests?: string;
}

export interface AvailabilityRuleFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface SpecialAvailabilityFormData {
  date: string;
  start_time?: string;
  end_time?: string;
  is_available: boolean;
  reason?: string;
}

// Authentication types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
}

export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'owner' | 'manager' | 'staff';
  email_verified: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Extended types with relations for components
export interface BusinessWithDetails extends Business {
  staff_members?: StaffMember[];
  services?: Service[];
  recent_bookings?: Booking[];
}

export interface ServiceWithStaff extends Service {
  staff_members?: StaffMember[];
}

export interface BookingWithDetails extends Booking {
  business?: Business;
  service?: Service;
  staff_member?: StaffMember;
}

export interface StaffMemberWithServices extends StaffMember {
  services?: Service[];
}

// Calendar and scheduling types
export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
  staff_member_id?: number;
  booking_id?: number;
}

export interface DaySchedule {
  date: string;
  day_of_week: number;
  is_available: boolean;
  time_slots: TimeSlot[];
}

export interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  color?: string;
  booking?: Booking;
  type: 'booking' | 'availability' | 'break';
}

// Filter and query types
export interface BookingFilters {
  business_id?: number;
  staff_member_id?: number;
  service_id?: number;
  date_from?: string;
  date_to?: string;
  status?: string;
  customer_email?: string;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface BookingQuery extends BookingFilters, PaginationParams {}

// Dashboard and analytics types
export interface DashboardStats {
  total_bookings: number;
  confirmed_bookings: number;
  pending_bookings: number;
  cancelled_bookings: number;
  revenue_today: number;
  revenue_this_month: number;
  upcoming_bookings: Booking[];
}

export interface BusinessAnalytics {
  bookings_by_day: { date: string; count: number }[];
  bookings_by_service: { service_name: string; count: number }[];
  revenue_by_month: { month: string; revenue: number }[];
  popular_time_slots: { time_slot: string; count: number }[];
}

// Component prop types
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  onRowClick?: (item: T) => void;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

// Navigation and routing types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType;
  active?: boolean;
  badge?: number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Utility types
export type BusinessType = 'restaurant' | 'hair_salon' | 'beauty_salon' | 'massage' | 'other';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type UserRole = 'owner' | 'manager' | 'staff';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [key: string]: string;
}

// Loading and error states
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface AsyncState<T = any> extends LoadingState {
  data?: T;
}

// Theme and UI types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Public booking page types (for customers)
export interface PublicBookingData {
  business: Pick<Business, 'id' | 'name' | 'type' | 'description' | 'booking_advance_days' | 'cancellation_hours' | 'require_phone'>;
  services: Service[];
  staff_members: StaffMember[];
}

export interface BookingStep {
  id: number;
  title: string;
  completed: boolean;
  active: boolean;
}

export interface AvailabilitySlot {
  date: string;
  time: string;
  staff_member_id?: number;
  available: boolean;
}

// Search and filter types
export interface SearchResult<T = any> {
  items: T[];
  total: number;
  query: string;
}

export interface FilterOption {
  value: string | number;
  label: string;
  count?: number;
}

// Settings types
export interface BusinessSettings {
  booking_advance_days: number;
  cancellation_hours: number;
  require_phone: boolean;
  require_deposit: boolean;
  deposit_amount?: number;
  email_notifications: boolean;
  sms_notifications: boolean;
  auto_confirm_bookings: boolean;
}

export interface NotificationSettings {
  email_new_booking: boolean;
  email_booking_cancelled: boolean;
  email_booking_reminder: boolean;
  sms_new_booking: boolean;
  sms_booking_cancelled: boolean;
  sms_booking_reminder: boolean;
}