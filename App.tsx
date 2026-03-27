
import React, { useState, useRef, useEffect } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { Header } from './components/Header';
import { MapComponent } from './components/MapComponent';
import { GeminiService, LocationCoords } from './services/geminiService';
import { DatabaseService } from './services/databaseService';
import { Message, ChatState } from './types';
import { Map as MapIcon, MessageSquare } from 'lucide-react';

const INITIAL_MESSAGE: Message = {
  id: 'init-1',
  role: 'model',
  content: "Hi! I'm your Blok M guide. Looking for a specific spot or just want to see what's nearby? 📍🍜\n\nHalo! Saya panduan Blok M kamu. Lagi cari tempat spesifik atau mau lihat apa yang ada di sekitar? 📍🍜",
  timestamp: new Date(),
};

const INITIAL_SUGGESTIONS = [
  "What's Viral? / Apa yang Viral?", "Best Coffee / Kopi Terbaik ☕", "Japanese Food / Makanan Jepang 🍜", "Spots Nearby / Tempat Terdekat 📍"
];

export default function App() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [INITIAL_MESSAGE],
    isLoading: false,
    error: null,
  });
  
  const [dbStatus, setDbStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [tenantCount, setTenantCount] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const [showMap, setShowMap] = useState(true);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.2444, 106.8018]);
  
  const geminiServiceRef = useRef<GeminiService | null>(null);
  const dbServiceRef = useRef<DatabaseService | null>(null);

  useEffect(() => {
    geminiServiceRef.current = new GeminiService();
    dbServiceRef.current = new DatabaseService();

    const initData = async () => {
      setDbStatus('syncing');
      try {
        const tenants = await dbServiceRef.current!.getTenants();
        geminiServiceRef.current!.setTenants(tenants);
        setTenantCount(tenants.length);
        setDbStatus('synced');
      } catch (e: any) {
        console.error("Init Error:", e);
        setDbStatus('error');
        setChatState(prev => ({
          ...prev,
          error: `Database Error: ${e.message}. Please check your Vercel Environment Variables.`
        }));
      }
    };

    initData();
  }, []);

  const getUserLocation = (): Promise<LocationCoords | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(undefined),
        { timeout: 5000 }
      );
    });
  };

  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const MESSAGE_COOLDOWN = 4000; // 4 seconds cooldown to be safe

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Check cooldown
    const now = Date.now();
    const timeSinceLast = now - lastMessageTime;
    if (timeSinceLast < MESSAGE_COOLDOWN) {
      const remaining = Math.ceil((MESSAGE_COOLDOWN - timeSinceLast) / 1000);
      setChatState(prev => ({
        ...prev,
        error: `Wait ${remaining}s... (Gemini Free Tier has a 15 requests/min limit)`
      }));
      
      // Auto-clear cooldown error after 2 seconds
      setTimeout(() => {
        setChatState(prev => {
          if (prev.error?.includes("Wait")) {
            return { ...prev, error: null };
          }
          return prev;
        });
      }, 2000);
      return;
    }

    setLastMessageTime(now);
    setSuggestions([]);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true,
      error: null,
    }));

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiMsgId, role: 'model', content: '', timestamp: new Date() };
    setChatState((prev) => ({ ...prev, messages: [...prev.messages, aiMsg] }));

    try {
      // Get location if possible for Maps grounding
      const location = await getUserLocation();
      
      // Prepare history for Gemini (excluding the current user message and the empty AI message)
      const history = chatState.messages
        .filter(m => m.content.trim() !== "")
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }))
        .slice(-20); // Keep last 20 messages for context
      
      const stream = geminiServiceRef.current!.sendMessageStream(text, history, location);
      let fullText = "";
      let finalMetadata: any = undefined;

      for await (const chunk of stream) {
        if (chunk.text) fullText += chunk.text;
        if (chunk.groundingMetadata) finalMetadata = chunk.groundingMetadata;

        setChatState((prev) => {
          const newMessages = [...prev.messages];
          const targetIndex = newMessages.findIndex(m => m.id === aiMsgId);
          if (targetIndex !== -1) {
            newMessages[targetIndex] = {
              ...newMessages[targetIndex],
              content: fullText,
              groundingMetadata: finalMetadata || newMessages[targetIndex].groundingMetadata
            };
          }
          return { ...prev, messages: newMessages };
        });
      }
      
      setChatState(prev => ({ ...prev, isLoading: false }));
      setSuggestions(["Show on map 🗺️", "Opening hours ⏰", "Get directions 🚗"]);

      // Extract markers from grounding metadata if available
      if (finalMetadata?.groundingChunks) {
        const newMarkers = finalMetadata.groundingChunks
          .filter((chunk: any) => chunk.maps?.uri && chunk.maps?.title)
          .map((chunk: any, idx: number) => {
            // Since we don't have lat/lng directly from groundingChunks usually, 
            // we'd need to search or use a placeholder near Blok M for now.
            // For a real app, we'd use a Geocoding API or the Maps grounding would provide it.
            // For now, let's just place them slightly offset from Blok M center for visibility.
            return {
              id: `marker-${idx}-${Date.now()}`,
              position: [-6.2444 + (Math.random() - 0.5) * 0.005, 106.8018 + (Math.random() - 0.5) * 0.005],
              title: chunk.maps.title,
              description: "Found via Google Maps"
            };
          });
        
        if (newMarkers.length > 0) {
          setMapMarkers(newMarkers);
          setMapCenter(newMarkers[0].position);
        }
      }

    } catch (err: any) {
      console.error("Chat error:", err);
      let errorMsg = err.message || "Failed to connect to AI.";
      
      if (errorMsg.includes("API key not valid") || errorMsg.includes("API_KEY_INVALID")) {
        errorMsg = "⚠️ API Key Error: Please check your Vercel Environment Variables. Ensure GEMINI_API_KEY is copied exactly from AI Studio Settings > Secrets.";
      } else if (errorMsg.includes("QUOTA_EXHAUSTED") || errorMsg.includes("429")) {
        errorMsg = "⚠️ Quota Exceeded: You've reached the Gemini API limit for now. Please wait a few minutes before trying again, or check your API plan.";
      }

      setChatState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMsg
      }));
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50">
      <Header dbStatus={dbStatus} tenantCount={tenantCount} />
      
      <main className="flex-1 overflow-hidden relative flex flex-col md:flex-row">
        {/* Chat Section */}
        <section className={`flex-1 flex flex-col transition-all duration-300 ${showMap ? 'md:w-2/3' : 'w-full'}`}>
          <ChatInterface 
            messages={chatState.messages} 
            isLoading={chatState.isLoading} 
            onSendMessage={handleSendMessage}
            error={chatState.error}
            suggestions={suggestions}
          />
        </section>

        {/* Map Section - Mobile Friendly Toggle */}
        <section className={`
          ${showMap 
            ? 'fixed inset-0 z-50 md:relative md:inset-auto md:h-full md:w-1/3 md:flex md:flex-col border-t md:border-t-0 md:border-l' 
            : 'hidden md:hidden'} 
          bg-white transition-all duration-300
        `}>
          <div className="absolute top-4 right-4 z-[1000] md:hidden">
            <button 
              onClick={() => setShowMap(false)}
              className="p-3 bg-white rounded-full shadow-2xl hover:bg-gray-100 border border-gray-200 active:scale-95 transition-transform"
            >
              <MessageSquare className="w-6 h-6 text-brand-600" />
            </button>
          </div>
          <div className="h-full p-3 md:p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-brand-500" />
                Blok M Explorer
              </h2>
              <button 
                onClick={() => setShowMap(false)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 hidden md:block px-2 py-1 rounded-md hover:bg-gray-50"
              >
                Hide Map
              </button>
            </div>
            <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-gray-100 shadow-inner">
              <MapComponent markers={mapMarkers} center={mapCenter} />
            </div>
          </div>
        </section>

        {/* Map Toggle Button (when hidden or on mobile) */}
        {!showMap && (
          <button 
            onClick={() => setShowMap(true)}
            className="fixed bottom-28 right-6 z-40 p-4 bg-brand-500 text-white rounded-full shadow-2xl hover:bg-brand-600 transition-all transform hover:scale-110 active:scale-90 flex items-center gap-2 border-2 border-white"
          >
            <MapIcon className="w-6 h-6" />
            <span className="text-sm font-bold pr-1">Map</span>
          </button>
        )}
      </main>
    </div>
  );
}
