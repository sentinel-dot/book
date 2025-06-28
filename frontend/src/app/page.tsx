'use client'; // CSR

import { useState, useEffect } from "react";
import Link from 'next/link';

interface ApiResponse {
  message?: string,
  status?: string,
  timestamp?: string;
}

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [apiData, setApiData] = useState<ApiResponse | null>(null);

  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/`);
        if (response.ok) {
          const data = await response.json();
          setApiData(data);
          setApiStatus('connected');
        } else {
          setApiStatus('error');
        }
      } catch (error) {
        console.error('Backend connection failed:', error);
        setApiStatus('error');
      }
    };

    checkBackendConnection();
  }, []); // Wofür?

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🍽️ OpenTable Clone
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your reservation system is ready to serve!
          </p>
        </div>

        {/* Backend Connection Status */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Backend Connection Status
            </h2>
            
            <div className="flex items-center mb-4">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                apiStatus === 'loading' ? 'bg-yellow-500' :
                apiStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className={`font-medium ${
                apiStatus === 'loading' ? 'text-yellow-600' :
                apiStatus === 'connected' ? 'text-green-600' : 'text-red-600'
              }`}>
                {apiStatus === 'loading' ? 'Checking connection...' :
                 apiStatus === 'connected' ? 'Connected to Backend' : 'Backend Disconnected'}
              </span>
            </div>

            {apiData && (
              <div className="bg-gray-50 rounded-md p-4 mb-4">
                <h3 className="font-medium text-gray-700 mb-2">API Response:</h3>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(apiData, null, 2)}
                </pre>
              </div>
            )}

            {apiStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-700">
                  Unable to connect to backend. Make sure your backend server is running on{' '}
                  <code className="bg-red-100 px-2 py-1 rounded">
                    {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}
                  </code>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Test Pages
            </h2>
            <div className="space-y-3">
              <Link
                href="/health"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors text-center"
              >
                🏥 Health Check Page
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
              >
                🔄 Refresh Connection
              </button>
            </div>
          </div>
        </div>

        {/* Environment Info */}
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Environment Info
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Frontend URL:</strong>
                <br />
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}
                </code>
              </div>
              <div>
                <strong>Backend API URL:</strong>
                <br />
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}