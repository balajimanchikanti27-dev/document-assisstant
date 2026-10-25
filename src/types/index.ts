export type AssistantMode = 'document' | 'research';

export type ResponseLengthPreference = 'short' | 'balanced' | 'detailed';

export type SourcePreference = 'wikipedia' | 'web' | 'both';

export type AuthProviderType = 'google' | 'password' | 'phone';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  authProvider: AuthProviderType;
  createdAt: string;
  updatedAt: string;
}

export type DocumentProcessingStatus = 'uploading' | 'processing' | 'ready' | 'error';

export type UploadStage =
  | 'selected'
  | 'uploading'
  | 'saving_metadata'
  | 'processing'
  | 'indexing'
  | 'ready'
  | 'error';

export interface UploadItemState {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  stage: UploadStage;
  stageMessage?: string;
  errorMessage?: string;
  documentId?: string;
}

export interface UserDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  uploadedAt: string;
  status: DocumentProcessingStatus;
  progress: number;
  pageCount?: number;
  slideCount?: number;
  chunkCount?: number;
  errorMessage?: string;
  downloadUrl?: string;
}

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

export interface SearchStatusState {
  step: SearchStep;
  message?: string;
  timestamp?: number;
}

export interface AttachedImagePayload {
  data: string; // Base64 content
  mimeType: string;
  filename?: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface AttachedImage {
  dataUrl: string; // Full data URL for client preview
  base64: string; // Clean base64 string
  mimeType: string;
  filename: string;
  size: number;
  width?: number;
  height?: number;
}

export interface ChatMessage {
  id: string;
  sessionId?: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  mode: AssistantMode;
  image?: AttachedImagePayload;
  citations?: SourceCitation[];
  status?: 'sending' | 'streaming' | 'complete' | 'error' | 'insufficient_evidence';
  isInsufficientEvidence?: boolean;
  errorMessage?: string;
  feedback?: 'like' | 'dislike' | null;
}

export interface ChatSession {
  id: string;
  title: string;
  mode: AssistantMode;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessageSnippet?: string;
  selectedDocumentIds?: string[];
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  defaultMode: AssistantMode;
  responseLength: ResponseLengthPreference;
  sourcePreference: SourcePreference;
  enableSearchHistory: boolean;
}

export interface PendingQuestion {
  question: string;
  mode: AssistantMode;
}
