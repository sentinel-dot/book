// frontend/src/services/businessService.ts
import { api } from '../utils/api';
import { Business, ApiResponse } from '../types/index';
import { BusinessWithStaff } from '../types/extended';

export class BusinessService {
  /**
   * Get all active businesses
   */
  static async getAllBusinesses(): Promise<Business[]> {
    try {
      const response = await api.get<ApiResponse<Business[]>>('/businesses');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch businesses');
      }
      
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching businesses:', error);
      throw error;
    }
  }

  /**
   * Get single business by slug with services and staff
   */
  static async getBusinessBySlug(slug: string): Promise<BusinessWithStaff> {
    try {
      if (!slug || slug.length < 2) {
        throw new Error('Invalid business slug');
      }

      const response = await api.get<ApiResponse<BusinessWithStaff>>(`/business/${slug}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Business not found');
      }
      
      if (!response.data.data) {
        throw new Error('No business data received');
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching business '${slug}':`, error);
      throw error;
    }
  }

  /**
   * Search businesses by name or type
   */
  static async searchBusinesses(query: string, type?: string): Promise<Business[]> {
    try {
      const businesses = await this.getAllBusinesses();
      
      let filtered = businesses;
      
      // Filter by search query (name, city, description)
      if (query && query.trim().length > 0) {
        const searchTerm = query.toLowerCase().trim();
        filtered = filtered.filter(business => 
          business.name.toLowerCase().includes(searchTerm) ||
          business.city?.toLowerCase().includes(searchTerm) ||
          business.description?.toLowerCase().includes(searchTerm)
        );
      }
      
      // Filter by business type
      if (type && type !== 'all') {
        filtered = filtered.filter(business => business.type === type);
      }
      
      return filtered;
    } catch (error) {
      console.error('Error searching businesses:', error);
      throw error;
    }
  }

  /**
   * Get businesses by city
   */
  static async getBusinessesByCity(city: string): Promise<Business[]> {
    try {
      const businesses = await this.getAllBusinesses();
      return businesses.filter(business => 
        business.city?.toLowerCase() === city.toLowerCase()
      );
    } catch (error) {
      console.error(`Error fetching businesses in ${city}:`, error);
      throw error;
    }
  }

  /**
   * Get businesses by type
   */
  static async getBusinessesByType(type: Business['type']): Promise<Business[]> {
    try {
      const businesses = await this.getAllBusinesses();
      return businesses.filter(business => business.type === type);
    } catch (error) {
      console.error(`Error fetching ${type} businesses:`, error);
      throw error;
    }
  }

  /**
   * Validate business slug format
   */
  static isValidSlug(slug: string): boolean {
    return !!(slug && 
      slug.length >= 2 && 
      slug.length <= 100 && 
      /^[a-z0-9-]+$/.test(slug));
  }

  /**
   * Format business type for display
   */
  static formatBusinessType(type: Business['type']): string {
    const typeMap: Record<Business['type'], string> = {
      'restaurant': 'Restaurant',
      'hair_salon': 'Hair Salon',
      'beauty_salon': 'Beauty Salon',
      'massage': 'Massage Therapy',
      'other': 'Other Services'
    };
    return typeMap[type] || type;
  }

  /**
   * Generate business booking URL
   */
  static getBookingUrl(business: Business): string {
    return `/book/${business.booking_link_slug}`;
  }

  /**
   * Format business address
   */
  static formatAddress(business: Business): string {
    const parts = [
      business.address,
      business.city,
      business.postal_code,
      business.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Calculate business rating placeholder (for future implementation)
   */
  static getBusinessRating(business: Business): number {
    // Placeholder - would come from reviews in future
    return 4.5;
  }

  /**
   * Get business operating status
   */
  static getOperatingStatus(business: Business): 'open' | 'closed' | 'unknown' {
    // Placeholder - would need availability rules and current time
    return 'unknown';
  }
}