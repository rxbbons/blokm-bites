import React, { useRef, useEffect } from 'react';
import { Message as MessageType } from '../types';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { Loader2 } from 'lucide-react';

interface ChatInterfaceProps {
  messages: MessageType[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  error: string | null;
  suggestions?: string[];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  isLoading, 
  onSendMessage,
  error,
  suggestions = []
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, suggestions]);

  return (
    <div className="flex flex-col h-full bg-white relative pt-16"> {/* pt-16 to account for fixed header */}
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar w-full pb-52"> {/* Increased padding for taller footer */}
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 w-full">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          
          {isLoading && (
             <div className="flex w-full justify-start animate-slide-up pl-1">
              <div className="flex items-center gap-3">
                 <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-white text-orange-500 rounded-full border border-gray-100 shadow-sm">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                  <span className="text-sm text-gray-400 font-medium animate-pulse">Thinking...</span>
              </div>
            </div>
          )}

          {error && (
              <div className="flex justify-center my-4">
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg border border-red-100 shadow-sm">
                      {error}
                  </div>
              </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Floating Input Section */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-white via-white via-80% to-transparent pt-12 pb-6 px-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          
          {/* Main Input */}
          <InputArea onSend={onSendMessage} isLoading={isLoading} />

          {/* Quick Replies (Styled like WelcomeScreen Cards) */}
          {!isLoading && suggestions.length > 0 && (
             <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-hide mask-fade-sides snap-x">
               {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(suggestion)}
                  className="flex-shrink-0 snap-start bg-white border border-gray-100 text-gray-700 hover:border-brand-200 hover:bg-brand-50 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md group flex items-center gap-3 min-w-[160px] justify-between"
                >
                  <span className="truncate max-w-[200px]">{suggestion}</span>
                  <span className="text-brand-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all duration-200">→</span>
                </button>
              ))}
             </div>
          )}
          
          <p className="text-center text-[10px] text-gray-400 font-medium">
             AI can make mistakes. Please verify official opening hours.
          </p>
        </div>
      </div>
    </div>
  );
};