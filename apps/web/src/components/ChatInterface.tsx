'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient, ChatMessage } from '@/lib/api';
import { Listing } from '@upseller/shared';

interface ChatInterfaceProps {
  listing: Listing | null;
}

export default function ChatInterface({ listing }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [schedulerData, setSchedulerData] = useState<{ timeSlots: string[]; spot?: string }>({ timeSlots: [] });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listing) {
      loadChatHistory();
    }
  }, [listing]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const response = await apiClient.getChatHistory();
      if (response.data) {
        setMessages(response.data);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !listing || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message to UI immediately
    const userChatMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userChatMessage]);

    try {
      const response = await apiClient.sendChatMessage(userMessage);
      if (response.data?.response) {
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMessage]);

        // No automatic popups - keep it as pure text conversation
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I had trouble processing your message. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    try {
      await apiClient.clearChatHistory();
      setMessages([]);
      setShowScheduler(false);
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  const scheduleAppointment = async (timeSlot: string, spot: string, buyerEmail?: string) => {
    try {
      const response = await apiClient.scheduleAppointment(timeSlot, spot, buyerEmail);
      if (response.data?.message) {
        const successMessage: ChatMessage = {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, successMessage]);
        setShowScheduler(false);
      }
    } catch (error) {
      console.error('Failed to schedule appointment:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I couldn\'t schedule the appointment. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  if (!listing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-xl font-medium text-gray-600 mb-2">No listing available</h2>
          <p className="text-gray-500">Create a listing first to start chatting with the AI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">👋</div>
            <p>Start a conversation about your item!</p>
            <p className="text-sm mt-2">Try: "Is this still available?" or "I'll offer $50"</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white rounded-2xl rounded-br-md' 
                : 'bg-gray-200 text-gray-900 rounded-2xl rounded-bl-md'
            } px-4 py-2`}>
              <p className="text-sm whitespace-pre-line">{message.content}</p>
              <div className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.role === 'user' ? 'You' : 'AI Seller'} • {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md bg-gray-200 text-gray-900 rounded-2xl rounded-bl-md px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scheduler Modal */}
      {showScheduler && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Schedule Pickup</h3>
            <div className="space-y-3">
              {schedulerData.timeSlots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => scheduleAppointment(slot, schedulerData.spot || listing.meetSpots[0])}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300"
                >
                  <div className="font-medium">{slot}</div>
                  <div className="text-sm text-gray-600">at {schedulerData.spot || listing.meetSpots[0]}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => setShowScheduler(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-2">
          <button
            onClick={clearChat}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            🗑️ Clear Chat
          </button>
        </div>
        
        <div className="flex space-x-4">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Chat about ${listing.title}...`}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          💡 Try: "Is this available?", "I'll offer $X", "When can we meet?", "I'll take it!"
        </div>
      </div>
    </div>
  );
}
