// frontend/src/components/business/BusinessCard.tsx
import React from 'react';
import Link from 'next/link';
import { Business } from '../../types';
import { BusinessService } from '../../services/businessService';

interface BusinessCardProps {
  business: Business;
  showBookingButton?: boolean;
  showFavoriteButton?: boolean;
  onFavoriteToggle?: (businessId: number) => void;
  isFavorite?: boolean;
  onClick?: (business: Business) => void;
  className?: string;
}

export function BusinessCard({ 
  business, 
  showBookingButton = true,
  showFavoriteButton = false,
  onFavoriteToggle,
  isFavorite = false,
  onClick,
  className = ''
}: BusinessCardProps) {
  const businessAddress = BusinessService.formatAddress(business);
  const businessType = BusinessService.formatBusinessType(business.type);
  const bookingUrl = BusinessService.getBookingUrl(business);

  const handleCardClick = () => {
    if (onClick) {
      onClick(business);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFavoriteToggle) {
      onFavoriteToggle(business.id);
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleCardClick}
    >
      {/* Business Header */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
            {business.name}
          </h3>
          <div className="flex items-center gap-2 ml-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {businessType}
            </span>
            {showFavoriteButton && (
              <button
                onClick={handleFavoriteClick}
                className={`p-1 rounded-full transition-colors ${
                  isFavorite 
                    ? 'text-red-500 hover:text-red-600' 
                    : 'text-gray-400 hover:text-red-500'
                }`}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite ? '❤️' : '🤍'}
              </button>
            )}
          </div>
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

        {/* External Links */}
        <div className="flex gap-2">
          {business.website_url && (
            <a
              href={business.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              onClick={(e) => e.stopPropagation()}
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
              onClick={(e) => e.stopPropagation()}
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
            onClick={(e) => e.stopPropagation()}
          >
            View Details
          </Link>
          {showBookingButton && (
            <Link
              href={bookingUrl}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-2 px-4 rounded-md font-medium text-sm transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Book Now
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}