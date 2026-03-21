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
    <div className="p-4">
      <div className="relative flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about food in Blok M..."
          disabled={isLoading}
          className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-full focus:ring-orange-500 focus:border-orange-500 block pl-5 pr-12 py-3 outline-none transition-all disabled:opacity-50 placeholder:text-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="absolute right-2 p-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-full transition-colors shadow-sm"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};