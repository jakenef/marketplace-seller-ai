'use client';

import { Thread } from '@/lib/api';

interface ThreadListProps {
  threads: Thread[];
  selectedThread: Thread | null;
  onSelectThread: (thread: Thread) => void;
}

export default function ThreadList({ threads, selectedThread, onSelectThread }: ThreadListProps) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">Facebook Marketplace Conversations</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {threads.map((thread) => (
          <div
            key={thread.id}
            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedThread?.id === thread.id ? 'bg-blue-50 border-blue-200' : ''
            }`}
            onClick={() => onSelectThread(thread)}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">{thread.name}</h3>
              <span className="text-xs text-gray-500">
                {new Date(thread.timestamp).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate">{thread.lastMessage}</p>
            {selectedThread?.id === thread.id && (
              <div className="mt-2 text-xs text-blue-600">
                • Active conversation
              </div>
            )}
          </div>
        ))}
        
        {threads.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            <p>No conversations yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
