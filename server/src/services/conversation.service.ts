import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AssistantMode, SourceCitation } from '../types.js';

export interface ChatMessageRecord {
  id: string;
  chatId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode: AssistantMode;
  citations?: SourceCitation[];
  isInsufficientEvidence?: boolean;
  modelUsed?: string;
  createdAt: number;
}

export interface ChatSessionRecord {
  id: string;
  userId: string;
  title: string;
  mode: AssistantMode;
  selectedDocumentIds?: string[];
  messageCount: number;
  lastMessageSnippet?: string;
  createdAt: number;
  updatedAt: number;
}

export class ConversationService {
  private chatsFile: string;
  private messagesFile: string;
  private chats: Map<string, ChatSessionRecord> = new Map();
  private messages: Map<string, ChatMessageRecord[]> = new Map();

  constructor() {
    try {
      const currentFile = fileURLToPath(import.meta.url);
      const serverRoot = path.resolve(path.dirname(currentFile), '..', '..');
      const dataDir = path.join(serverRoot, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      this.chatsFile = path.join(dataDir, 'chats.json');
      this.messagesFile = path.join(dataDir, 'messages.json');
    } catch {
      const dataDir = path.resolve(process.cwd(), 'data');
      this.chatsFile = path.join(dataDir, 'chats.json');
      this.messagesFile = path.join(dataDir, 'messages.json');
    }

    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.chatsFile)) {
        const raw = fs.readFileSync(this.chatsFile, 'utf-8');
        const list: ChatSessionRecord[] = JSON.parse(raw);
        for (const c of list) {
          this.chats.set(c.id, c);
        }
      }
    } catch (err: any) {
      console.warn('[CONVERSATION SERVICE] Could not load chats from disk:', err.message);
    }

    try {
      if (fs.existsSync(this.messagesFile)) {
        const raw = fs.readFileSync(this.messagesFile, 'utf-8');
        const mapObj: Record<string, ChatMessageRecord[]> = JSON.parse(raw);
        for (const [chatId, msgs] of Object.entries(mapObj)) {
          this.messages.set(chatId, msgs);
        }
      }
    } catch (err: any) {
      console.warn('[CONVERSATION SERVICE] Could not load messages from disk:', err.message);
    }
  }

  private saveChatsToDisk(): void {
    try {
      const list = Array.from(this.chats.values());
      fs.writeFileSync(this.chatsFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[CONVERSATION SERVICE] Could not save chats to disk:', err.message);
    }
  }

  private saveMessagesToDisk(): void {
    try {
      const obj: Record<string, ChatMessageRecord[]> = {};
      for (const [chatId, msgs] of this.messages.entries()) {
        obj[chatId] = msgs;
      }
      fs.writeFileSync(this.messagesFile, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[CONVERSATION SERVICE] Could not save messages to disk:', err.message);
    }
  }

  public createChat(
    userId: string,
    mode: AssistantMode,
    title: string,
    selectedDocumentIds?: string[]
  ): ChatSessionRecord {
    const id = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    const session: ChatSessionRecord = {
      id,
      userId,
      title: title || (mode === 'document' ? 'Document Inquiry' : 'Web Research'),
      mode,
      selectedDocumentIds: selectedDocumentIds || [],
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.chats.set(id, session);
    this.messages.set(id, []);
    this.saveChatsToDisk();
    return session;
  }

  public listChats(userId: string, mode?: AssistantMode): ChatSessionRecord[] {
    const userChats = Array.from(this.chats.values()).filter((c) => c.userId === userId);
    const filtered = mode ? userChats.filter((c) => c.mode === mode) : userChats;
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public getChat(userId: string, chatId: string): ChatSessionRecord | null {
    const chat = this.chats.get(chatId);
    if (!chat || chat.userId !== userId) return null;
    return chat;
  }

  public updateChat(
    userId: string,
    chatId: string,
    updates: { title?: string; selectedDocumentIds?: string[] }
  ): ChatSessionRecord | null {
    const chat = this.chats.get(chatId);
    if (!chat || chat.userId !== userId) return null;

    if (updates.title) chat.title = updates.title;
    if (updates.selectedDocumentIds) chat.selectedDocumentIds = updates.selectedDocumentIds;
    chat.updatedAt = Date.now();

    this.saveChatsToDisk();
    return chat;
  }

  public deleteChat(userId: string, chatId: string): boolean {
    const chat = this.chats.get(chatId);
    if (!chat || chat.userId !== userId) return false;

    this.chats.delete(chatId);
    this.messages.delete(chatId);
    this.saveChatsToDisk();
    this.saveMessagesToDisk();
    return true;
  }

  public getMessages(userId: string, chatId: string): ChatMessageRecord[] {
    const chat = this.chats.get(chatId);
    if (!chat || chat.userId !== userId) return [];
    return this.messages.get(chatId) || [];
  }

  public addMessage(
    userId: string,
    chatId: string,
    data: {
      role: 'user' | 'assistant' | 'system';
      content: string;
      mode: AssistantMode;
      citations?: SourceCitation[];
      isInsufficientEvidence?: boolean;
      modelUsed?: string;
    }
  ): ChatMessageRecord {
    let chat = this.chats.get(chatId);
    if (!chat) {
      // Auto-create chat if it didn't exist yet
      const title = data.content.slice(0, 45) + (data.content.length > 45 ? '...' : '');
      chat = this.createChat(userId, data.mode, title);
      chatId = chat.id;
    }

    const msgList = this.messages.get(chatId) || [];
    const messageRecord: ChatMessageRecord = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      chatId,
      userId,
      role: data.role,
      content: data.content,
      mode: data.mode,
      citations: data.citations || [],
      isInsufficientEvidence: data.isInsufficientEvidence,
      modelUsed: data.modelUsed,
      createdAt: Date.now(),
    };

    msgList.push(messageRecord);
    this.messages.set(chatId, msgList);

    chat.messageCount = msgList.length;
    chat.lastMessageSnippet = data.content.slice(0, 80);
    chat.updatedAt = Date.now();

    this.saveChatsToDisk();
    this.saveMessagesToDisk();
    return messageRecord;
  }

  public clearAllUserChats(userId: string): number {
    let deletedCount = 0;
    for (const [id, chat] of this.chats.entries()) {
      if (chat.userId === userId) {
        this.chats.delete(id);
        this.messages.delete(id);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      this.saveChatsToDisk();
      this.saveMessagesToDisk();
    }
    return deletedCount;
  }
}

export const conversationService = new ConversationService();
