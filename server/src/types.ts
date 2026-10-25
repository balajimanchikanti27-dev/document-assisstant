export type AssistantMode = 'document' | 'research';
export type ResponseLengthPreference = 'short' | 'balanced' | 'detailed';
export type SourcePreference = 'wikipedia' | 'web' | 'both';

export interface SourceCitation {
  id: string;
  sourceType: 'document' | 'wikipedia' | 'web';
  title: string;
  url?: string;
  domain?: string;
  snippet?: string;
  documentId?: string;
  documentName?: string;
  pageNumber?: number;
  slideNumber?: number;
  heading?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  userId: string;
  documentName: string;
  sourceFilename?: string;
  fileType?: string;
  pageNumber?: number;
  slideNumber?: number;
  heading?: string;
  sectionTitle?: string;
  chunkIndex?: number;
  sequenceNumber?: number;
  processingVersion?: string;
  indexingVersion?: string;
  createdAt?: number;
  text: string;
  textContent?: string;
  embedding: number[];
}

export interface ExtractedSection {
  pageNumber?: number;
  slideNumber?: number;
  heading?: string;
  text: string;
}

export interface DocumentQueryPayload {
  question: string;
  documentIds: string[];
  userId?: string;
  conversationId?: string;
  previousMessages?: { sender: 'user' | 'assistant'; text: string }[];
}

export interface DocumentQueryResponse {
  success?: boolean;
  statusCode?: number;
  answer: string;
  isInsufficientEvidence: boolean;
  citations: SourceCitation[];
  confidence?: number;
  rejectionReason?: string;
  mode?: AssistantMode;
  requestId?: string;
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
  retrievalLogs?: {
    retrievedChunks: {
      chunkId: string;
      documentName: string;
      pageOrSlide: string;
      score: number;
      preview: string;
    }[];
    timestamp: number;
  };
}

export type SearchStep =
  | 'idle'
  | 'understanding'
  | 'searching_wikipedia'
  | 'searching_web'
  | 'reading_sources'
  | 'generating'
  | 'completed'
  | 'error';

export interface AttachedImagePayload {
  data: string; // Base64 content
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  filename?: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface WebResearchPayload {
  question: string;
  sourcePreference: SourcePreference;
  responseLength: ResponseLengthPreference;
  conversationId?: string;
  userId?: string;
  previousMessages?: { sender: 'user' | 'assistant'; text: string }[];
  image?: AttachedImagePayload;
}

export interface WebResearchResponse {
  success?: boolean;
  answer: string;
  citations: SourceCitation[];
  mode?: AssistantMode;
  requestId?: string;
  model?: string;
  searchSteps: { step: SearchStep; message: string; timestamp: number }[];
  noSourcesFound: boolean;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

