'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import ListingForm from '@/components/ListingForm';
import ChatInterface from '@/components/ChatInterface';
import { Listing } from '@upseller/shared';

export default function Home() {
  const [currentListing, setCurrentListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentListing();
  }, []);

  const loadCurrentListing = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getCurrentListing();
      if (response.data) {
        setCurrentListing(response.data);
      }
    } catch (error) {
      console.error('Failed to load current listing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleListingCreated = () => {
    loadCurrentListing();
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">
              🤖 Marketplace Seller AI
            </h1>
            <span className="text-sm text-gray-500">
              Demo Chat Interface
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <ListingForm onListingCreated={handleListingCreated} />
            
            {currentListing && (
              <div className="text-sm text-gray-600">
                Selling: <span className="font-medium">{currentListing.title}</span> - ${currentListing.listPrice}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          {currentListing 
            ? '💬 Chat with the AI about your item. Try asking questions, making offers, or scheduling a pickup!' 
            : '📝 Create a listing to start chatting with the AI seller assistant'
          }
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface listing={currentListing} />
      </div>
    </div>
  );
}
