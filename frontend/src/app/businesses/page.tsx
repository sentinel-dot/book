'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../utils/api';

// Simple interfaces for this page only
interface Business {
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

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Load businesses on component mount
  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get<ApiResponse<Business[]>>('/businesses');
      
      if (response.data.success && response.data.data) {
        setBusinesses(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to load businesses');
      }
    } catch (err) {
      console.error('Error loading businesses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  // Filter businesses based on search and type
  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch = !searchQuery || 
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedType === 'all' || business.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const formatBusinessType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'restaurant': 'Restaurant',
      'hair_salon': 'Hair Salon',
      'beauty_salon': 'Beauty Salon',
      'massage': 'Massage Therapy',
      'other': 'Other Services'
    };
    return typeMap[type] || type;
  };

  const formatAddress = (business: Business): string => {
    const parts = [business.address, business.city, business.postal_code, business.country].filter(Boolean);
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading businesses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Find Businesses
          </h1>
          <p className="text-gray-600">
            Discover and book services from {businesses.length} active businesses
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Query */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                id="search"
                type="text"
                placeholder="Business name, city, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Business Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                id="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="restaurant">Restaurant</option>
                <option value="hair_salon">Hair Salon</option>
                <option value="beauty_salon">Beauty Salon</option>
                <option value="massage">Massage Therapy</option>
                <option value="other">Other Services</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? 'es' : ''} found
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-red-600 mr-2">⚠️</span>
                <p className="text-red-700">{error}</p>
              </div>
              <button
                onClick={loadBusinesses}
                className="text-red-600 hover:text-red-800 font-medium text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredBusinesses.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No businesses found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or clearing the filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('all');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Business Grid */}
        {!loading && !error && filteredBusinesses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Business Card Component
function BusinessCard({ business }: { business: Business }) {
  const formatBusinessType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'restaurant': 'Restaurant',
      'hair_salon': 'Hair Salon',
      'beauty_salon': 'Beauty Salon',
      'massage': 'Massage Therapy',
      'other': 'Other Services'
    };
    return typeMap[type] || type;
  };

  const formatAddress = (business: Business): string => {
    const parts = [business.address, business.city, business.postal_code, business.country].filter(Boolean);
    return parts.join(', ');
  };

  const businessAddress = formatAddress(business);
  const businessType = formatBusinessType(business.type);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Business Header */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {business.name}
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {businessType}
          </span>
        </div>

        {/* Description */}
        {business.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {business.description}
          </p>
        )}

        {/* Address */}
        {businessAddress && (
          <p className="text-gray-500 text-sm mb-3 flex items-center">
            <span className="mr-1">📍</span>
            {businessAddress}
          </p>
        )}

        {/* Contact Info */}
        <div className="space-y-1 mb-4">
          {business.email && (
            <p className="text-gray-500 text-sm flex items-center">
              <span className="mr-1">✉️</span>
              {business.email}
            </p>
          )}
          {business.phone && (
            <p className="text-gray-500 text-sm flex items-center">
              <span className="mr-1">📞</span>
              {business.phone}
            </p>
          )}
        </div>

        {/* Links */}
        <div className="flex gap-2">
          {business.website_url && (
            <a
              href={business.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              🌐 Website
            </a>
          )}
          {business.instagram_handle && (
            <a
              href={`https://instagram.com/${business.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-600 hover:text-pink-800 text-sm font-medium"
            >
              📸 Instagram
            </a>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex gap-2">
          <Link
            href={`/business/${business.booking_link_slug}`}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-md font-medium text-sm transition-colors"
          >
            View Details
          </Link>
          <Link
            href={`/book/${business.booking_link_slug}`}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-2 px-4 rounded-md font-medium text-sm transition-colors"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}