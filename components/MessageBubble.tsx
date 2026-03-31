
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { Bot, User, ExternalLink, MapPin, Navigation } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div className={`flex max-w-[92%] md:max-w-[85%] gap-2 md:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 h-6 w-6 md:h-8 md:w-8 flex items-center justify-center mt-0.5 md:mt-1 rounded-full shadow-sm ${
          isUser ? 'bg-orange-100 text-orange-600' : 'bg-white border border-gray-100 text-orange-500'
        }`}>
          {isUser ? <User size={12} className="md:w-4 md:h-4" /> : <Bot size={12} className="md:w-4 md:h-4" />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col gap-1 md:gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
          <div
            className={`px-3 py-1.5 md:px-5 md:py-3 shadow-sm text-[11px] md:text-sm leading-relaxed ${
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
                  remarkPlugins={[remarkGfm]}
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

          {/* Response Time */}
          {!isUser && message.responseTime !== undefined && (
            <span className="text-[9px] md:text-[10px] text-gray-400 font-medium ml-1">
              responded in {message.responseTime}s
            </span>
          )}

          {/* Integrated Map & Grounding Links */}
          {!isUser && message.groundingMetadata?.groundingChunks && (
            <div className="flex flex-col gap-3 w-full mt-1">
              {/* Integrated Map Embeds */}
              {message.groundingMetadata.groundingChunks
                .filter(chunk => {
                  const title = (chunk.maps?.title || chunk.web?.title || "").toLowerCase();
                  const uri = (chunk.maps?.uri || chunk.web?.uri || "").toLowerCase();
                  
                  // Forbidden areas that often pop up
                  const forbidden = ['senopati', 'kemang', 'sudirman', 'scbd', 'menteng', 'pik', 'bsd', 'bintaro'];
                  const isForbidden = forbidden.some(area => title.includes(area) || uri.includes(area));
                  
                  // Must be relevant to Blok M or at least not forbidden
                  const isRelevant = !!chunk.maps?.uri || (chunk.web?.title?.toLowerCase().includes('maps'));
                  
                  return isRelevant && !isForbidden;
                })
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
                      {/* Action Bar - Simplified to just buttons/links */}
                      <div className="p-2.5 md:p-4 flex flex-col gap-2.5 md:gap-3 bg-white">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="bg-orange-50 p-1.5 md:p-2 rounded-xl text-orange-600 flex-shrink-0 shadow-sm border border-orange-100">
                            <MapPin size={16} className="md:w-5 md:h-5" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-[8px] md:text-[10px] font-bold text-orange-800 uppercase tracking-widest leading-none mb-1">Verified Location</span>
                            <span className="text-xs md:text-base font-bold text-gray-900 truncate">{title}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full">
                          <a 
                            href={destinationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-[10px] md:text-sm font-bold flex items-center justify-center gap-1.5 md:gap-2 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                          >
                            <Navigation size={12} className="md:w-4 md:h-4" />
                            Open in Maps
                          </a>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(finalSearchQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-white border border-gray-200 hover:border-orange-200 hover:bg-orange-50 text-gray-700 hover:text-orange-700 px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-[10px] md:text-sm font-bold flex items-center justify-center gap-1.5 md:gap-2 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                          >
                            <ExternalLink size={12} className="md:w-4 md:h-4" />
                            Directions
                          </a>
                        </div>
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
