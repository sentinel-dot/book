'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BusinessWithStaff } from '../../../types/extended';
import { Service, StaffMember } from '../../../types/index';
import { BusinessService } from '../../../services/businessService';

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [business, setBusiness] = useState<BusinessWithStaff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) {
      loadBusiness();
    }
  }, [slug]);

  const loadBusiness = async () => {
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);

      if (!BusinessService.isValidSlug(slug)) {
        setNotFound(true);
        return;
      }

      const data = await BusinessService.getBusinessBySlug(slug);
      setBusiness(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load business details');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatBusinessType = (type: string): string => {
    return BusinessService.formatBusinessType(type as any);
  };

  const getBusinessAddress = (): string => {
    return business ? BusinessService.formatAddress(business) : '';
  };

  const formatPrice = (price?: number): string => {
    if (!price) return 'Price on request';
    return `$${price.toFixed(2)}`;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading business details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Business Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              The business "{slug}" could not be found or may no longer be active.
            </p>
            <div className="space-x-4">
              <Link
                href="/businesses"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
              >
                Browse All Businesses
              </Link>
              <button
                onClick={() => router.back()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-md font-medium"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-center mb-4">
              <span className="text-red-600 text-2xl mr-3">⚠️</span>
              <h1 className="text-xl font-semibold text-red-900">
                Failed to Load Business
              </h1>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="space-x-4">
              <button
                onClick={loadBusiness}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Try Again
              </button>
              <Link
                href="/businesses"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Browse All Businesses
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main content
  if (!business) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <span>→</span>
            <Link href="/businesses" className="hover:text-blue-600">Businesses</Link>
            <span>→</span>
            <span className="text-gray-900 font-medium">{business.name}</span>
          </div>
        </nav>

        {/* Business Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  {business.name}
                </h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {formatBusinessType(business.type)}
                </span>
              </div>

              {business.description && (
                <p className="text-gray-600 text-lg mb-6 max-w-3xl">
                  {business.description}
                </p>
              )}

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getBusinessAddress() && (
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2 text-lg">📍</span>
                    <span>{getBusinessAddress()}</span>
                  </div>
                )}
                {business.email && (
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2 text-lg">✉️</span>
                    <a href={`mailto:${business.email}`} className="hover:text-blue-600">
                      {business.email}
                    </a>
                  </div>
                )}
                {business.phone && (
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2 text-lg">📞</span>
                    <a href={`tel:${business.phone}`} className="hover:text-blue-600">
                      {business.phone}
                    </a>
                  </div>
                )}
              </div>

              {/* External Links */}
              {(business.website_url || business.instagram_handle) && (
                <div className="flex gap-4 mt-6">
                  {business.website_url && (
                    <a
                      href={business.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                    >
                      🌐 Visit Website
                    </a>
                  )}
                  {business.instagram_handle && (
                    <a
                      href={`https://instagram.com/${business.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-pink-600 hover:text-pink-800 font-medium"
                    >
                      📸 Follow on Instagram
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Booking CTA */}
            <div className="mt-6 lg:mt-0 lg:ml-8">
              <Link
                href={BusinessService.getBookingUrl(business)}
                className="block w-full lg:w-auto bg-green-600 hover:bg-green-700 text-white text-center px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
              >
                📅 Book Now
              </Link>
              <p className="text-sm text-gray-500 text-center mt-2">
                Book up to {business.booking_advance_days} days in advance
              </p>
            </div>
          </div>
        </div>

        {/* Services Section */}
        {business.services && business.services.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Our Services ({business.services.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {business.services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>
        )}

        {/* Staff Section */}
        {business.staff_members && business.staff_members.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Our Team ({business.staff_members.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {business.staff_members.map((staff) => (
                <StaffCard key={staff.id} staff={staff} />
              ))}
            </div>
          </div>
        )}

        {/* Business Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Booking Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Booking Policies</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <span className="mr-2">📅</span>
                  Book up to {business.booking_advance_days} days in advance
                </li>
                <li className="flex items-center">
                  <span className="mr-2">⏰</span>
                  Cancel at least {business.cancellation_hours} hours before
                </li>
                {business.require_phone && (
                  <li className="flex items-center">
                    <span className="mr-2">📞</span>
                    Phone number required for booking
                  </li>
                )}
                {business.require_deposit && (
                  <li className="flex items-center">
                    <span className="mr-2">💳</span>
                    Deposit required: {business.deposit_amount ? `${business.deposit_amount}` : 'Amount varies'}
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Contact Details</h3>
              <div className="space-y-2 text-gray-600">
                <p><strong>Email:</strong> {business.email}</p>
                {business.phone && <p><strong>Phone:</strong> {business.phone}</p>}
                {getBusinessAddress() && <p><strong>Address:</strong> {getBusinessAddress()}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Back Navigation */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-md font-medium"
          >
            ← Go Back
          </button>
          <Link
            href="/businesses"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
          >
            Browse All Businesses
          </Link>
        </div>
      </div>
    </div>
  );
}

// Service Card Component
function ServiceCard({ service }: { service: Service }) {
  const formatPrice = (price?: number): string => {
    if (!price) return 'Price on request';
    return `${price.toFixed(2)}`;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 line-clamp-2">
          {service.name}
        </h3>
        <span className="text-lg font-bold text-green-600 whitespace-nowrap ml-2">
          {formatPrice(service.price)}
        </span>
      </div>
      
      {service.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {service.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span className="flex items-center">
          <span className="mr-1">⏱️</span>
          {formatDuration(service.duration_minutes)}
        </span>
        <span className="flex items-center">
          <span className="mr-1">👥</span>
          Up to {service.capacity}
        </span>
      </div>
      
      {service.requires_staff && (
        <div className="mt-2 text-xs text-blue-600 font-medium">
          Staff member required
        </div>
      )}
    </div>
  );
}

// Staff Card Component
function StaffCard({ staff }: { staff: StaffMember }) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-3 bg-gray-200 rounded-full overflow-hidden">
        {staff.avatar_url ? (
          <img 
            src={staff.avatar_url} 
            alt={staff.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
            👤
          </div>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">
        {staff.name}
      </h3>
      {staff.description && (
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
          {staff.description}
        </p>
      )}
      <div className="space-y-1 text-xs text-gray-500">
        {staff.email && (
          <div className="flex items-center justify-center">
            <span className="mr-1">✉️</span>
            <span>{staff.email}</span>
          </div>
        )}
        {staff.phone && (
          <div className="flex items-center justify-center">
            <span className="mr-1">📞</span>
            <span>{staff.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}