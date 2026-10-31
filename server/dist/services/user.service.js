import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { vectorStore } from '../vectorStore/memoryVectorStore.js';
import { documentJobManager } from '../jobs/documentJobManager.js';
const DEFAULT_SETTINGS = {
    theme: 'system',
    defaultMode: 'document',
    responseLength: 'balanced',
    sourcePreference: 'both',
    enableSearchHistory: true,
};
export class UserService {
    usersFile;
    settingsFile;
    users = new Map();
    settings = new Map();
    constructor() {
        try {
            const currentFile = fileURLToPath(import.meta.url);
            const serverRoot = path.resolve(path.dirname(currentFile), '..', '..');
            const dataDir = path.join(serverRoot, 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            this.usersFile = path.join(dataDir, 'users.json');
            this.settingsFile = path.join(dataDir, 'settings.json');
        }
        catch {
            const dataDir = path.resolve(process.cwd(), 'data');
            this.usersFile = path.join(dataDir, 'users.json');
            this.settingsFile = path.join(dataDir, 'settings.json');
        }
        this.loadFromDisk();
    }
    loadFromDisk() {
        try {
            if (fs.existsSync(this.usersFile)) {
                const raw = fs.readFileSync(this.usersFile, 'utf-8');
                const list = JSON.parse(raw);
                for (const u of list) {
                    this.users.set(u.uid, u);
                }
            }
        }
        catch (err) {
            console.warn('[USER SERVICE] Could not load users from disk:', err.message);
        }
        try {
            if (fs.existsSync(this.settingsFile)) {
                const raw = fs.readFileSync(this.settingsFile, 'utf-8');
                const list = JSON.parse(raw);
                for (const s of list) {
                    this.settings.set(s.uid, s.settings);
                }
            }
        }
        catch (err) {
            console.warn('[USER SERVICE] Could not load settings from disk:', err.message);
        }
    }
    saveUsersToDisk() {
        try {
            const list = Array.from(this.users.values());
            fs.writeFileSync(this.usersFile, JSON.stringify(list, null, 2), 'utf-8');
        }
        catch (err) {
            console.warn('[USER SERVICE] Could not save users to disk:', err.message);
        }
    }
    saveSettingsToDisk() {
        try {
            const list = Array.from(this.settings.entries()).map(([uid, s]) => ({ uid, settings: s }));
            fs.writeFileSync(this.settingsFile, JSON.stringify(list, null, 2), 'utf-8');
        }
        catch (err) {
            console.warn('[USER SERVICE] Could not save settings to disk:', err.message);
        }
    }
    getProfile(userId) {
        return this.users.get(userId) || null;
    }
    syncProfile(profile) {
        const existing = this.users.get(profile.uid);
        const now = new Date().toISOString();
        const updated = {
            uid: profile.uid,
            email: profile.email ?? existing?.email,
            displayName: profile.displayName ?? existing?.displayName ?? 'User',
            phoneNumber: profile.phoneNumber ?? existing?.phoneNumber,
            photoURL: profile.photoURL ?? existing?.photoURL,
            authProvider: profile.authProvider ?? existing?.authProvider ?? 'password',
            createdAt: existing?.createdAt || now,
            updatedAt: now,
        };
        this.users.set(profile.uid, updated);
        this.saveUsersToDisk();
        return updated;
    }
    updateProfile(userId, data) {
        let profile = this.users.get(userId);
        const now = new Date().toISOString();
        if (!profile) {
            profile = {
                uid: userId,
                displayName: data.displayName || 'User',
                photoURL: data.photoURL,
                createdAt: now,
                updatedAt: now,
            };
        }
        else {
            if (data.displayName !== undefined)
                profile.displayName = data.displayName;
            if (data.photoURL !== undefined)
                profile.photoURL = data.photoURL;
            profile.updatedAt = now;
        }
        this.users.set(userId, profile);
        this.saveUsersToDisk();
        return profile;
    }
    getSettings(userId) {
        return this.settings.get(userId) || { ...DEFAULT_SETTINGS };
    }
    updateSettings(userId, updates) {
        const current = this.getSettings(userId);
        const updated = { ...current, ...updates };
        this.settings.set(userId, updated);
        this.saveSettingsToDisk();
        return updated;
    }
    async deleteUserAndData(userId) {
        // 1. Remove vector chunks
        const deletedChunks = vectorStore.deleteDocumentChunks(userId, '');
        // 2. Remove files from uploads directory
        let deletedFiles = 0;
        try {
            const docsDir = documentJobManager.getDocumentsDirectory();
            if (fs.existsSync(docsDir)) {
                const files = fs.readdirSync(docsDir);
                for (const file of files) {
                    if (file.startsWith(`${userId}__`)) {
                        try {
                            fs.unlinkSync(path.join(docsDir, file));
                            deletedFiles++;
                        }
                        catch { }
                    }
                }
            }
        }
        catch { }
        // 3. Remove user profile and settings
        this.users.delete(userId);
        this.settings.delete(userId);
        this.saveUsersToDisk();
        this.saveSettingsToDisk();
        return { deletedChunks, deletedFiles };
    }
}
export const userService = new UserService();
