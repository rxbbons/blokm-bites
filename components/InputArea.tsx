import React, { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface InputAreaProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-1.5 md:p-4">
      <div className="relative flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about food in Blok M..."
          disabled={isLoading}
          className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm md:text-sm rounded-xl md:rounded-full focus:ring-orange-500 focus:border-orange-500 block pl-3.5 md:pl-5 pr-10 md:pr-12 py-2.5 md:py-3.5 outline-none transition-all disabled:opacity-50 placeholder:text-gray-400 shadow-sm"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="absolute right-1 md:right-1.5 p-2 md:p-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-lg md:rounded-full transition-all shadow-md active:scale-90"
        >
          <Send size={16} className="md:w-4 md:h-4" />
        </button>
      </div>
    </div>
  );
};