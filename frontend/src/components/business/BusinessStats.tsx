// frontend/src/components/business/BusinessStats.tsx
import React from 'react';
import { Business } from '../../types';
import { BusinessService } from '../../services/businessService';

interface BusinessStatsProps {
  businesses: Business[];
  className?: string;
}

export function BusinessStats({ businesses, className = '' }: BusinessStatsProps) {
  const stats = React.useMemo(() => {
    const totalBusinesses = businesses.length;
    
    // Count by type
    const typeCount = businesses.reduce((acc, business) => {
      acc[business.type] = (acc[business.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count by city
    const cityCount = businesses.reduce((acc, business) => {
      if (business.city) {
        acc[business.city] = (acc[business.city] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Most popular type
    const mostPopularType = Object.entries(typeCount).reduce(
      (max, [type, count]) => count > max.count ? { type, count } : max,
      { type: '', count: 0 }
    );

    // Most popular city
    const mostPopularCity = Object.entries(cityCount).reduce(
      (max, [city, count]) => count > max.count ? { city, count } : max,
      { city: '', count: 0 }
    );

    return {
      total: totalBusinesses,
      typeCount,
      cityCount,
      mostPopularType: mostPopularType.type ? {
        type: BusinessService.formatBusinessType(mostPopularType.type as any),
        count: mostPopularType.count
      } : null,
      mostPopularCity: mostPopularCity.city ? {
        city: mostPopularCity.city,
        count: mostPopularCity.count
      } : null,
      uniqueCities: Object.keys(cityCount).length,
      uniqueTypes: Object.keys(typeCount).length
    };
  }, [businesses]);

  if (stats.total === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Overview</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Businesses</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.uniqueTypes}</div>
          <div className="text-sm text-gray-600">Business Types</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.uniqueCities}</div>
          <div className="text-sm text-gray-600">Cities</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {stats.mostPopularType?.count || 0}
          </div>
          <div className="text-sm text-gray-600">
            {stats.mostPopularType?.type || 'N/A'}
          </div>
        </div>
      </div>

      {(stats.mostPopularType || stats.mostPopularCity) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {stats.mostPopularType && (
              <div>
                <span className="font-medium text-gray-700">Most Popular Type:</span>
                <br />
                <span className="text-gray-600">
                  {stats.mostPopularType.type} ({stats.mostPopularType.count} businesses)
                </span>
              </div>
            )}
            {stats.mostPopularCity && (
              <div>
                <span className="font-medium text-gray-700">Most Popular City:</span>
                <br />
                <span className="text-gray-600">
                  {stats.mostPopularCity.city} ({stats.mostPopularCity.count} businesses)
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}