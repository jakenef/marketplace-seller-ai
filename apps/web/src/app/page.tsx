'use client';

import { useState, useEffect } from 'react';
import { Thread, apiClient } from '@/lib/api';
import ThreadList from '@/components/ThreadList';
import ChatPanel from '@/components/ChatPanel';
import ListingForm from '@/components/ListingForm';

export default function Home() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [mode, setMode] = useState<'mock' | 'shadow'>('mock');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getThreads();
      if (response.data) {
        setThreads(response.data);
        if (response.data.length > 0 && !selectedThread) {
          setSelectedThread(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = async (newMode: 'mock' | 'shadow') => {
    try {
      const response = await apiClient.setMode(newMode);
      if (response.data) {
        setMode(newMode);
      }
    } catch (error) {
      console.error('Failed to set mode:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
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
              🤖 Upseller AI Assistant
            </h1>
            <span className="text-sm text-gray-500">
              Facebook Marketplace Automation
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <ListingForm onListingCreated={loadThreads} />
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Mode:</label>
              <select
                value={mode}
                onChange={(e) => handleModeChange(e.target.value as 'mock' | 'shadow')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mock">Mock</option>
                <option value="shadow">Shadow</option>
              </select>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              mode === 'mock' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              {mode.toUpperCase()} MODE
            </div>
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          {mode === 'mock' 
            ? '🎭 Mock mode: AI responses are simulated' 
            : '👥 Shadow mode: AI drafts replies but requires human approval'
          }
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <ThreadList
          threads={threads}
          selectedThread={selectedThread}
          onSelectThread={setSelectedThread}
        />
        <ChatPanel
          selectedThread={selectedThread}
          mode={mode}
        />
      </div>
    </div>
  );
}
