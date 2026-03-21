
import React, { useState, useRef, useEffect } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { Header } from './components/Header';
import { GeminiService, LocationCoords } from './services/geminiService';
import { DatabaseService } from './services/databaseService';
import { Message, ChatState } from './types';

const INITIAL_MESSAGE: Message = {
  id: 'init-1',
  role: 'model',
  content: "Hi! I'm your Blok M guide. I speak both English and Indonesian.\n\nHalo! Saya panduan Blok M kamu. Saya bisa bicara bahasa Inggris dan Indonesia.\n\nLooking for a specific spot or just want to see what's nearby? 📍🍜",
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
      } catch (e) {
        setDbStatus('error');
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

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
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
      
      const stream = geminiServiceRef.current!.sendMessageStream(text, location);
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

    } catch (err: any) {
      console.error("Chat error:", err);
      setChatState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err.message || "Failed to connect to AI." 
      }));
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50">
      <Header dbStatus={dbStatus} tenantCount={tenantCount} />
      <main className="flex-1 overflow-hidden relative flex flex-col">
        <ChatInterface 
          messages={chatState.messages} 
          isLoading={chatState.isLoading} 
          onSendMessage={handleSendMessage}
          error={chatState.error}
          suggestions={suggestions}
        />
      </main>
    </div>
  );
}
