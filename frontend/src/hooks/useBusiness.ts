// frontend/src/hooks/useBusiness.ts
import { useState, useEffect, useCallback } from 'react';
import { Business } from '../types/index';
import { BusinessWithStaff } from '../types/extended';
import { BusinessService } from '../services/businessService';
import { LoadingState, SearchFilters } from '../types/extended';

// Hook for managing business list
export function useBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading('loading');
      setError(null);
      const data = await BusinessService.getAllBusinesses();
      setBusinesses(data);
      setLoading('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch businesses');
      setLoading('error');
    }
  }, []);

  const searchBusinesses = useCallback(async (filters: SearchFilters) => {
    try {
      setLoading('loading');
      setError(null);
      const data = await BusinessService.searchBusinesses(filters.query, filters.type === 'all' ? undefined : filters.type);
      
      // Apply city filter if provided
      let filtered = data;
      if (filters.city && filters.city.trim().length > 0) {
        const cityTerm = filters.city.toLowerCase().trim();
        filtered = data.filter(business =>
          business.city?.toLowerCase().includes(cityTerm)
        );
      }
      
      setBusinesses(filtered);
      setLoading('success');
      return filtered;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search businesses');
      setLoading('error');
      return [];
    }
  }, []);

  const refresh = useCallback(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  return {
    businesses,
    loading,
    error,
    searchBusinesses,
    refresh,
    isLoading: loading === 'loading',
    isError: loading === 'error',
    isSuccess: loading === 'success',
  };
}

// Hook for managing single business details
export function useBusiness(slug: string | null) {
  const [business, setBusiness] = useState<BusinessWithStaff | null>(null);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchBusiness = useCallback(async (businessSlug: string) => {
    try {
      setLoading('loading');
      setError(null);
      setNotFound(false);

      if (!BusinessService.isValidSlug(businessSlug)) {
        setNotFound(true);
        setLoading('error');
        return;
      }

      const data = await BusinessService.getBusinessBySlug(businessSlug);
      setBusiness(data);
      setLoading('success');
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch business');
      }
      setLoading('error');
    }
  }, []);

  const refresh = useCallback(() => {
    if (slug) {
      fetchBusiness(slug);
    }
  }, [slug, fetchBusiness]);

  useEffect(() => {
    if (slug) {
      fetchBusiness(slug);
    } else {
      setBusiness(null);
      setLoading('idle');
      setError(null);
      setNotFound(false);
    }
  }, [slug, fetchBusiness]);

  return {
    business,
    loading,
    error,
    notFound,
    refresh,
    isLoading: loading === 'loading',
    isError: loading === 'error',
    isSuccess: loading === 'success',
  };
}

// Hook for business filtering and search functionality
export function useBusinessSearch(initialBusinesses: Business[] = []) {
  const [businesses, setBusinesses] = useState<Business[]>(initialBusinesses);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>(initialBusinesses);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: 'all',
    city: '',
  });

  // Update initial businesses when prop changes
  useEffect(() => {
    setBusinesses(initialBusinesses);
    setFilteredBusinesses(initialBusinesses);
  }, [initialBusinesses]);

  // Filter businesses when filters change
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...businesses];

      // Search query filter
      if (filters.query && filters.query.trim().length > 0) {
        const searchTerm = filters.query.toLowerCase().trim();
        filtered = filtered.filter(business =>
          business.name.toLowerCase().includes(searchTerm) ||
          business.city?.toLowerCase().includes(searchTerm) ||
          business.description?.toLowerCase().includes(searchTerm)
        );
      }

      // Business type filter
      if (filters.type && filters.type !== 'all') {
        filtered = filtered.filter(business => business.type === filters.type);
      }

      // City filter
      if (filters.city && filters.city.trim().length > 0) {
        const cityTerm = filters.city.toLowerCase().trim();
        filtered = filtered.filter(business =>
          business.city?.toLowerCase().includes(cityTerm)
        );
      }

      setFilteredBusinesses(filtered);
    };

    applyFilters();
  }, [businesses, filters]);

  const updateFilter = useCallback((field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      query: '',
      type: 'all',
      city: '',
    });
  }, []);

  const hasActiveFilters = filters.query || filters.type !== 'all' || filters.city;

  return {
    filteredBusinesses,
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    resultCount: filteredBusinesses.length,
  };
}

// Hook for business favorites (localStorage-based)
export function useBusinessFavorites() {
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('business-favorites');
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (err) {
        console.error('Failed to parse favorites from localStorage:', err);
        localStorage.removeItem('business-favorites');
      }
    }
  }, []);

  const addFavorite = useCallback((businessId: number) => {
    setFavorites(prev => {
      const updated = [...prev, businessId];
      localStorage.setItem('business-favorites', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFavorite = useCallback((businessId: number) => {
    setFavorites(prev => {
      const updated = prev.filter(id => id !== businessId);
      localStorage.setItem('business-favorites', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleFavorite = useCallback((businessId: number) => {
    if (favorites.includes(businessId)) {
      removeFavorite(businessId);
    } else {
      addFavorite(businessId);
    }
  }, [favorites, addFavorite, removeFavorite]);

  const isFavorite = useCallback((businessId: number) => {
    return favorites.includes(businessId);
  }, [favorites]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
}