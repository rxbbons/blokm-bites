
import React from 'react';
import { UtensilsCrossed, Database, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface HeaderProps {
  dbStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  tenantCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ dbStatus = 'idle', tenantCount = 0 }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm w-full">
      <div className="max-w-5xl mx-auto px-3 py-1.5 md:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-orange-500 text-white p-1 md:p-2 rounded-lg shadow-sm">
            <UtensilsCrossed size={16} className="md:w-5 md:h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-lg leading-tight text-gray-900 tracking-tight">Blok M Bites</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {dbStatus === 'syncing' && <RefreshCw size={7} className="text-blue-500 animate-spin md:w-2.5 md:h-2.5" />}
                {dbStatus === 'synced' && <CheckCircle2 size={7} className="text-green-500 md:w-2.5 md:h-2.5" />}
                {dbStatus === 'error' && <AlertCircle size={7} className="text-red-500 md:w-2.5 md:h-2.5" />}
                <span className="text-[8px] md:text-[10px] font-semibold text-gray-500 flex items-center gap-1">
                  <Database size={7} className="md:w-2.5 md:h-2.5" />
                  {tenantCount} F&B Tenants Verified
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-[8px] md:text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 md:py-1 rounded-full border border-orange-100 font-bold uppercase tracking-wider">
          <span className="hidden xs:inline">F&B Database</span> Live
        </div>
      </div>
    </header>
  );
};
