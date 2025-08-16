'use client';

import { useState, useEffect } from 'react';
import { Thread, apiClient } from '@/lib/api';
import { BuyerMessage, DraftReply } from '@upseller/shared';

interface ChatPanelProps {
  selectedThread: Thread | null;
  mode: 'mock' | 'shadow';
}

export default function ChatPanel({ selectedThread, mode }: ChatPanelProps) {
  const [messages, setMessages] = useState<(BuyerMessage | DraftReply & { type: 'draft' })[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (selectedThread) {
      setMessages(selectedThread.messages.map(msg => ({ ...msg, type: 'buyer' as const })));
    }
  }, [selectedThread]);

  const handleMessageClick = async (message: BuyerMessage) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const response = await apiClient.processMessage(message);
      
      if (response.data) {
        setMessages(prev => [...prev, { ...response.data!, type: 'draft' }]);
      }
    } catch (error) {
      console.error('Failed to process message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedThread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-xl font-medium text-gray-600 mb-2">Select a conversation</h2>
          <p className="text-gray-500">Choose a thread from the left to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{selectedThread.name}</h2>
            <p className="text-sm text-gray-500">
              Last active: {new Date(selectedThread.timestamp).toLocaleString()}
            </p>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${
            'type' in message && message.type === 'draft' ? 'justify-end' : 'justify-start'
          }`}>
            {'type' in message && message.type === 'draft' ? (
              // Draft reply bubble
              <div className="max-w-xs lg:max-w-md">
                <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2">
                  <p className="text-sm">{message.text}</p>
                  {message.action && (
                    <div className="mt-2 text-xs opacity-80">
                      Action: {message.action}
                      {message.counterPrice && ` ($${message.counterPrice})`}
                      {message.meetSpot && ` at ${message.meetSpot}`}
                    </div>
                  )}
                  {message.proposedTimes && message.proposedTimes.length > 0 && (
                    <div className="mt-2 text-xs opacity-80">
                      Proposed times: {message.proposedTimes.map(time => 
                        new Date(time).toLocaleTimeString()
                      ).join(', ')}
                    </div>
                  )}
                  {message.requireHumanClick && (
                    <div className="mt-2 text-xs bg-yellow-500 bg-opacity-20 rounded px-2 py-1">
                      ⚠️ Requires human review
                    </div>
                  )}
                  {message.safetyNote && (
                    <div className="mt-2 text-xs bg-red-500 bg-opacity-20 rounded px-2 py-1">
                      🚨 {message.safetyNote}
                    </div>
                  )}
                  {message.icsPath && (
                    <div className="mt-2">
                      <a 
                        href={`http://localhost:4002${message.icsPath}`}
                        className="text-xs underline"
                        download
                      >
                        📅 Download Calendar Invite
                      </a>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1 text-right">
                  AI Assistant • {mode === 'shadow' ? 'Draft ready' : 'Sent'}
                </div>
              </div>
            ) : (
              // Buyer message bubble
              <div className="max-w-xs lg:max-w-md">
                <div 
                  className="bg-gray-200 text-gray-900 rounded-2xl rounded-bl-md px-4 py-2 cursor-pointer hover:bg-gray-300 transition-colors"
                  onClick={() => handleMessageClick(message as BuyerMessage)}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {selectedThread.name} • {new Date((message as BuyerMessage).ts).toLocaleTimeString()}
                  {!messages.some((m, i) => i > index && 'type' in m && m.type === 'draft') && (
                    <span className="ml-2 text-blue-600">← Click to generate reply</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-end">
            <div className="max-w-xs lg:max-w-md">
              <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
