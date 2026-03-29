
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
      const startTime = Date.now();

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
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      setChatState(prev => {
        const newMessages = [...prev.messages];
        const targetIndex = newMessages.findIndex(m => m.id === aiMsgId);
        if (targetIndex !== -1) {
          newMessages[targetIndex] = {
            ...newMessages[targetIndex],
            responseTime: Number(duration.toFixed(1))
          };
        }
        return { ...prev, messages: newMessages, isLoading: false };
      });
      setSuggestions(["What's Viral? / Apa yang Viral?", "Best Coffee / Kopi Terbaik ☕", "Japanese Food / Makanan Jepang 🍜"]);

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
    <div className="flex flex-col h-[100dvh] w-full bg-gray-50 overflow-hidden">
      <div className="flex-shrink-0">
        <Header dbStatus={dbStatus} tenantCount={tenantCount} />
      </div>
      
      <main className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
        {/* Chat Section */}
        <section className="flex-1 min-h-0 flex flex-col">
          <ChatInterface 
            messages={chatState.messages} 
            isLoading={chatState.isLoading} 
            onSendMessage={handleSendMessage}
            error={chatState.error}
            suggestions={suggestions}
          />
        </section>
      </main>
    </div>
  );
}
