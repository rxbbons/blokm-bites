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
    <div className="flex flex-col h-full bg-white relative">
      
      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-behavior-contain touch-pan-y custom-scrollbar w-full pb-24 md:pb-40 scroll-smooth z-10">
        <div className="max-w-4xl mx-auto px-2 md:px-4 pt-2 pb-6 md:py-8 space-y-3 md:space-y-8 w-full">
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
          
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Floating Input Section */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-white via-white via-70% to-transparent pt-2 pb-0.5 md:pb-4 px-1 md:px-4 pointer-events-none">
        <div className="max-w-3xl mx-auto flex flex-col gap-0.5 md:gap-2 pointer-events-auto">
          
          {/* Error Message */}
          {error && (
              <div className="flex flex-col items-center gap-2 mb-1 animate-slide-up">
                  <div className="bg-red-50 text-red-600 text-[10px] md:text-[11px] px-3 py-2 rounded-lg border border-red-100 shadow-sm w-full text-center font-medium">
                      {error}
                  </div>
                  <button 
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        const res = await fetch("/api/test-gemini");
                        const data = await res.json();
                        alert(data.status === "success" ? "✅ Connection Success!" : "❌ Connection Failed: " + data.message);
                      } catch (e: any) {
                        alert("Test Request Failed: " + e.message);
                      }
                    }}
                    className="text-[9px] bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700 transition-all shadow-md font-bold uppercase tracking-wider active:scale-95 cursor-pointer"
                  >
                    Test API
                  </button>
              </div>
          )}

          {/* Quick Replies (Horizontal Scroll on Mobile) */}
          {!isLoading && suggestions.length > 0 && (
             <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-hide mask-fade-sides snap-x no-scrollbar touch-pan-x">
               {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(suggestion)}
                  className="flex-shrink-0 snap-start bg-white border border-gray-200 text-gray-700 hover:border-brand-200 hover:bg-brand-50 px-3 py-2 md:px-5 md:py-3 rounded-xl text-[11px] md:text-sm font-bold transition-all duration-200 shadow-sm hover:shadow-md group flex items-center gap-2 md:gap-3 min-w-[130px] md:min-w-[160px] justify-between active:scale-95"
                >
                  <span className="truncate max-w-[150px] md:max-w-[200px]">{suggestion}</span>
                  <span className="text-brand-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all duration-200">→</span>
                </button>
              ))}
             </div>
          )}

          {/* Main Input */}
          <InputArea onSend={onSendMessage} isLoading={isLoading} />
          
          <p className="text-center text-[9px] md:text-[10px] text-gray-400 font-medium pb-1 flex flex-col items-center">
             <span>AI can make mistakes. Please verify official opening hours.</span>
             <span>This chatbot is designed for the Blok M area and has limited database.</span>
          </p>
        </div>
      </div>
    </div>
  );
};