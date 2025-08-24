// frontend/src/components/business/BusinessList.tsx
import React from 'react';
import { Business } from '../../types';
import { BusinessCard } from './BusinessCard';

interface BusinessListProps {
  businesses: Business[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  showBookingButtons?: boolean;
  showFavoriteButtons?: boolean;
  onBusinessClick?: (business: Business) => void;
  onFavoriteToggle?: (businessId: number) => void;
  favoriteBusinessIds?: number[];
  className?: string;
}

export function BusinessList({
  businesses,
  loading = false,
  error = null,
  emptyMessage = "No businesses found",
  showBookingButtons = true,
  showFavoriteButtons = false,
  onBusinessClick,
  onFavoriteToggle,
  favoriteBusinessIds = [],
  className = ''
}: BusinessListProps) {
  // Loading state
  if (loading) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading businesses...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Error Loading Businesses
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
      </div>
    );
  }

  // Empty state
  if (businesses.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Businesses Found
        </h3>
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  // Business grid
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {businesses.map((business) => (
        <BusinessCard
          key={business.id}
          business={business}
          showBookingButton={showBookingButtons}
          showFavoriteButton={showFavoriteButtons}
          onFavoriteToggle={onFavoriteToggle}
          isFavorite={favoriteBusinessIds.includes(business.id)}
          onClick={onBusinessClick}
        />
      ))}
    </div>
  );
}