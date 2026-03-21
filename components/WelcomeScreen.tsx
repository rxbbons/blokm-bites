import React from 'react';
import { Utensils, Flame } from 'lucide-react';
import { QuickOption } from '../types';

interface WelcomeScreenProps {
  onStart: (prompt: string) => void;
}

const QUICK_OPTIONS: QuickOption[] = [
  { label: "What's Viral?", emoji: "🔥", prompt: "What are the viral food spots in Blok M right now? Tell me what to order." },
  { label: "Coffee Spots", emoji: "☕", prompt: "I need a good coffee shop in Blok M. Somewhere comfortable." },
  { label: "Little Tokyo", emoji: "🍜", prompt: "Guide me to the best authentic food in Little Tokyo, Blok M." },
  { label: "Under 50k", emoji: "💸", prompt: "I'm on a budget. What are the best meals under 50k in Blok M?" },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="absolute inset-0 bg-white z-10 flex flex-col p-6 overflow-y-auto">
      
      <div className="mt-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hungry in Blok M?</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Let's find your next meal. I track the trends, the hidden gems, and the legends so you don't have to.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex flex-col gap-2">
          <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-orange-500">
            <Flame size={16} />
          </div>
          <span className="font-semibold text-sm text-gray-800">Viral Tracker</span>
        </div>
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col gap-2">
          <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-blue-500">
            <Utensils size={16} />
          </div>
          <span className="font-semibold text-sm text-gray-800">Curated Picks</span>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Start a chat</h3>
      
      <div className="flex flex-col gap-3">
        {QUICK_OPTIONS.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => onStart(opt.prompt)}
            className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-all duration-200 group shadow-sm bg-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl group-hover:scale-110 transition-transform">{opt.emoji}</span>
                <span className="font-medium text-gray-800">{opt.label}</span>
              </div>
              <span className="text-gray-300 group-hover:text-brand-400 text-lg">→</span>
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-auto pt-8 text-center">
        <p className="text-xs text-gray-400">Powered by Gemini 2.5 • Data from Google Search</p>
      </div>
    </div>
  );
};
