
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  groundingChunks: GroundingChunk[];
  groundingSupports?: any[];
  webSearchQueries?: string[];
}

export interface Tenant {
  name: string;
  category: string;
  subcategory: string;
  keywords: string;
  address?: string;
  mapsUrl?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  groundingMetadata?: GroundingMetadata;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface QuickOption {
  label: string;
  emoji: string;
  prompt: string;
}
