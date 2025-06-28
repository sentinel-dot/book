'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HealthData {
  status: string;
  timestamp: string;
}

interface SystemHealth {
  frontend: 'healthy' | 'error';
  backend: 'healthy' | 'error' | 'loading';
  database: 'healthy' | 'error' | 'unknown';
  backendData?: HealthData;
  error?: string;
}

export default function HealthPage() {
  const [health, setHealth] = useState<SystemHealth>({
    frontend: 'healthy',
    backend: 'loading',
    database: 'unknown',
  });

  const [lastChecked, setLastChecked] = useState<string>('');

  const checkHealth = async () => {
    setHealth(prev => ({ ...prev, backend: 'loading' }));
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/health`);
      
      if (response.ok) {
        const data: HealthData = await response.json();
        setHealth({
          frontend: 'healthy',
          backend: 'healthy',
          database: 'healthy', // Assuming if backend responds, DB is connected
          backendData: data,
        });
      } else {
        setHealth({
          frontend: 'healthy',
          backend: 'error',
          database: 'unknown',
          error: `HTTP ${response.status}: ${response.statusText}`,
        });
      }
    } catch (error) {
      setHealth({
        frontend: 'healthy',
        backend: 'error',
        database: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    setLastChecked(new Date().toLocaleString());
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'loading': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'error': return '❌';
      case 'loading': return '⏳';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🏥 System Health Check
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Monitor your OpenTable Clone system status
          </p>
          {lastChecked && (
            <p className="text-sm text-gray-500">
              Last checked: {lastChecked}
            </p>
          )}
        </div>

        {/* Health Status Cards */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Frontend Status */}
            <div className={`border rounded-lg p-6 ${getStatusColor(health.frontend)}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Frontend</h3>
                <span className="text-2xl">{getStatusIcon(health.frontend)}</span>
              </div>
              <p className="text-sm mb-2">
                <strong>Status:</strong> {health.frontend}
              </p>
              <p className="text-sm">
                <strong>Framework:</strong> Next.js 14
              </p>
            </div>

            {/* Backend Status */}
            <div className={`border rounded-lg p-6 ${getStatusColor(health.backend)}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Backend API</h3>
                <span className="text-2xl">{getStatusIcon(health.backend)}</span>
              </div>
              <p className="text-sm mb-2">
                <strong>Status:</strong> {health.backend}
              </p>
              <p className="text-sm">
                <strong>Framework:</strong> Express.js
              </p>
              {health.backendData && (
                <p className="text-xs mt-2">
                  Server time: {new Date(health.backendData.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Database Status */}
            <div className={`border rounded-lg p-6 ${getStatusColor(health.database)}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Database</h3>
                <span className="text-2xl">{getStatusIcon(health.database)}</span>
              </div>
              <p className="text-sm mb-2">
                <strong>Status:</strong> {health.database}
              </p>
              <p className="text-sm">
                <strong>Type:</strong> MySQL/MariaDB
              </p>
            </div>
          </div>
        </div>

        {/* Error Details */}
        {health.error && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Connection Error
              </h3>
              <p className="text-red-700 mb-4">{health.error}</p>
              <div className="text-sm text-red-600">
                <p><strong>Troubleshooting:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Make sure your backend server is running on port 5000</li>
                  <li>Check if the API URL is correct: <code className="bg-red-100 px-1 rounded">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}</code></li>
                  <li>Verify CORS settings allow requests from the frontend</li>
                  <li>Check the browser console for additional error details</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* System Details */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              System Details
            </h2>
            
            {health.backendData && (
              <div className="bg-gray-50 rounded-md p-4 mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Backend Response:</h3>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(health.backendData, null, 2)}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Frontend Environment:</strong>
                <br />
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {process.env.NODE_ENV || 'development'}
                </code>
              </div>
              <div>
                <strong>API Endpoint:</strong>
                <br />
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={checkHealth}
                disabled={health.backend === 'loading'}
                className="block w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
              >
                {health.backend === 'loading' ? '🔄 Checking...' : '🔄 Refresh Health Check'}
              </button>
              <Link
                href="/"
                className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-md transition-colors text-center"
              >
                🏠 Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              💡 Development Tips
            </h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Backend should be running: <code className="bg-blue-100 px-1 rounded">cd backend && npm run dev</code></li>
              <li>• Frontend should be running: <code className="bg-blue-100 px-1 rounded">cd frontend && npm run dev</code></li>
              <li>• Check your .env files for correct API URLs</li>
              <li>• Monitor the terminal for any server errors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}