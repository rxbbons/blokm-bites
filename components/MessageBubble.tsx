
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { Bot, User, ExternalLink, MapPin, Navigation } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div className={`flex max-w-[85%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 h-8 w-8 flex items-center justify-center mt-1 rounded-full shadow-sm ${
          isUser ? 'bg-orange-100 text-orange-600' : 'bg-white border border-gray-100 text-orange-500'
        }`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
          <div
            className={`px-5 py-3 shadow-sm text-sm leading-relaxed ${
              isUser
                ? 'bg-orange-500 text-white rounded-2xl rounded-tr-none'
                : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none'
            }`}
          >
            {isUser ? (
              <p>{message.content}</p>
            ) : (
              <div className="prose prose-sm prose-orange max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                <ReactMarkdown
                  components={{
                    a: ({ node, ...props }) => (
                      <a 
                        {...props} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-orange-600 font-bold underline hover:text-orange-700"
                      />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Integrated Map & Grounding Links */}
          {!isUser && message.groundingMetadata?.groundingChunks && (
            <div className="flex flex-col gap-3 w-full mt-1">
              {/* Integrated Map Embeds */}
              {message.groundingMetadata.groundingChunks
                .filter(chunk => !!chunk.maps?.uri || (chunk.web?.title?.toLowerCase().includes('maps')))
                .slice(0, 3)
                .map((chunk, idx) => {
                  const rawTitle = chunk.maps?.title || chunk.web?.title || "Blok M Spot";
                  const title = rawTitle.toLowerCase().includes('blok m') 
                    ? rawTitle 
                    : `${rawTitle} (Blok M)`;
                  
                  // Ensure we have a valid web URL for navigation
                  let destinationUrl = chunk.maps?.uri || chunk.web?.uri || "";
                  
                  // Fix potential deep links or non-https links that don't work in browser
                  if (destinationUrl && (
                    destinationUrl.startsWith('intent://') || 
                    destinationUrl.startsWith('google.navigation:') || 
                    destinationUrl.startsWith('comgooglemaps:') ||
                    !destinationUrl.startsWith('http')
                  )) {
                    destinationUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawTitle + " Blok M Jakarta")}`;
                  }
                  
                  // If still empty, fallback to a search link
                  if (!destinationUrl) {
                    destinationUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawTitle + " Blok M Jakarta")}`;
                  }

                  // Ensure the embed query is extremely specific to Blok M Melawai
                  let finalSearchQuery = rawTitle.toLowerCase().includes('blok m') 
                    ? `${rawTitle} Jakarta Selatan` 
                    : `${rawTitle} Blok M Melawai Jakarta Selatan`;
                  
                  // Try to extract a better search query from the destination URL if it's a search link
                  // This ensures we use the exact query the Google Maps tool found
                  if (destinationUrl.includes('query=')) {
                    try {
                      const url = new URL(destinationUrl);
                      const queryParam = url.searchParams.get('query');
                      if (queryParam) {
                        // Add Blok M if it's missing to be safe
                        finalSearchQuery = queryParam.toLowerCase().includes('blok m') 
                          ? queryParam 
                          : `${queryParam} Blok M Jakarta`;
                      }
                    } catch (e) {
                      // Fallback to default search query
                    }
                  }

                  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(finalSearchQuery)}&t=&z=17&ie=UTF8&iwloc=&output=embed`;
                  
                  return (
                    <div key={`map-container-${idx}`} className="flex flex-col gap-0 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      {/* Map Embed - Clickable overlay to open full map */}
                      <div className="w-full h-44 bg-gray-100 relative group">
                        <iframe
                          title={`Map for ${title}`}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          src={embedUrl}
                          loading="lazy"
                        ></iframe>
                        <a 
                          href={destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center"
                          title="Open in Google Maps"
                        >
                          <div className="bg-white/90 px-3 py-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-gray-700 flex items-center gap-1">
                            <ExternalLink size={10} />
                            Open Full Map
                          </div>
                        </a>
                      </div>
                      
                      {/* Action Bar */}
                      <div className="p-3 flex items-center justify-between bg-white border-t border-gray-100">
                        <a 
                          href={destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 overflow-hidden mr-2 hover:opacity-80 transition-opacity"
                        >
                          <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600 flex-shrink-0">
                            <MapPin size={16} />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider leading-none mb-0.5">Verified Location</span>
                            <span className="text-sm font-bold text-gray-800 truncate">{title}</span>
                          </div>
                        </a>
                        <a
                          href={destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                        >
                          <Navigation size={12} />
                          Directions
                        </a>
                      </div>
                    </div>
                  );
                })}

              {/* Standard Web Source Links */}
              <div className="flex flex-wrap gap-2">
                {message.groundingMetadata.groundingChunks
                  .filter(chunk => !!chunk.web?.uri && !chunk.web?.title?.toLowerCase().includes('maps'))
                  .map((chunk, idx) => (
                    <a
                      key={`web-${idx}`}
                      href={chunk.web!.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] bg-white border border-gray-200 px-2 py-1 rounded-md text-gray-500 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm"
                    >
                      <ExternalLink size={10} />
                      <span className="truncate max-w-[120px] font-medium">{chunk.web!.title}</span>
                    </a>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
