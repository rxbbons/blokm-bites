
import React from 'react';
import { UtensilsCrossed, Database, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface HeaderProps {
  dbStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  tenantCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ dbStatus = 'idle', tenantCount = 0 }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm w-full">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 text-white p-2 rounded-lg shadow-sm">
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-gray-900 tracking-tight">Blok M Bites</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {dbStatus === 'syncing' && <RefreshCw size={10} className="text-blue-500 animate-spin" />}
                {dbStatus === 'synced' && <CheckCircle2 size={10} className="text-green-500" />}
                {dbStatus === 'error' && <AlertCircle size={10} className="text-red-500" />}
                <span className="text-[10px] font-semibold text-gray-500 flex items-center gap-1">
                  <Database size={10} />
                  {tenantCount} Verified Venues
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-[10px] bg-orange-50 text-orange-700 px-2 py-1 rounded-full border border-orange-100 font-bold uppercase tracking-wider">
          F&B Database Live
        </div>
      </div>
    </header>
  );
};
