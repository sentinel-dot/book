// frontend/src/components/business/BusinessSearch.tsx
import React from 'react';
import { SearchFilters, BUSINESS_TYPES } from '../../types/extended';

interface BusinessSearchProps {
  filters: SearchFilters;
  onFilterChange: (field: keyof SearchFilters, value: string) => void;
  onClearFilters: () => void;
  resultCount?: number;
  loading?: boolean;
  className?: string;
}

export function BusinessSearch({
  filters,
  onFilterChange,
  onClearFilters,
  resultCount,
  loading = false,
  className = ''
}: BusinessSearchProps) {
  const hasActiveFilters = filters.query || filters.type !== 'all' || filters.city;

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Query */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            id="search"
            type="text"
            placeholder="Business name, city, or service..."
            value={filters.query}
            onChange={(e) => onFilterChange('query', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Business Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            id="type"
            value={filters.type}
            onChange={(e) => onFilterChange('type', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {BUSINESS_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <input
            id="city"
            type="text"
            placeholder="City name..."
            value={filters.city}
            onChange={(e) => onFilterChange('city', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Filter Actions */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          {typeof resultCount === 'number' 
            ? `${resultCount} business${resultCount !== 1 ? 'es' : ''} found`
            : 'Search businesses'
          }
          {loading && (
            <span className="ml-2 inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></span>
          )}
        </p>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
