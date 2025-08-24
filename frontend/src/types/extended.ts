// frontend/src/types/extended.ts
import { Business, StaffMember, Service } from './index';

// Re-export main types for convenience
export type { Business, StaffMember, Service } from './index';

// Extended types with relations (matching backend)
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

// UI-specific types
export interface BusinessCardProps {
  business: Business;
  showBookingButton?: boolean;
  onClick?: (business: Business) => void;
}

export interface BusinessListProps {
  businesses: Business[];
  loading?: boolean;
  error?: string | null;
  onBusinessClick?: (business: Business) => void;
}

export interface BusinessDetailProps {
  business: BusinessWithStaff;
  loading?: boolean;
  error?: string | null;
}

export interface SearchFilters {
  query: string;
  type: Business['type'] | 'all';
  city: string;
}

export interface BusinessSearchProps {
  onSearch: (filters: SearchFilters) => void;
  loading?: boolean;
  resultCount?: number;
}

// Business type options for forms and filters
export const BUSINESS_TYPES: Array<{
  value: Business['type'] | 'all';
  label: string;
}> = [
  { value: 'all', label: 'All Types' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hair_salon', label: 'Hair Salon' },
  { value: 'beauty_salon', label: 'Beauty Salon' },
  { value: 'massage', label: 'Massage Therapy' },
  { value: 'other', label: 'Other Services' },
];

// Status types for UI
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface UseBusinessState {
  businesses: Business[];
  selectedBusiness: BusinessWithStaff | null;
  loading: LoadingState;
  error: string | null;
}

// Component state interfaces
export interface BusinessPageState {
  businesses: Business[];
  filteredBusinesses: Business[];
  searchFilters: SearchFilters;
  loading: boolean;
  error: string | null;
}

export interface BusinessDetailPageState {
  business: BusinessWithStaff | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
}