import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
/**
 * User Feedback and Improvement Store
 * Phase 8: Securely stores user feedback metadata, aggregates satisfaction metrics,
 * and provides analytics for comparing retrieval and generation performance.
 * NOTE: User feedback is never treated as verified ground truth and private documents
 * are never used for model training without explicit authorization.
 */
export class FeedbackStore {
    feedbackItems = [];
    filePath;
    constructor(storageDir) {
        let resolvedDir = storageDir;
        if (!resolvedDir) {
            try {
                const currentFile = fileURLToPath(import.meta.url);
                const serverRoot = path.resolve(path.dirname(currentFile), '..', '..');
                resolvedDir = path.join(serverRoot, 'data');
            }
            catch {
                resolvedDir = path.resolve(process.cwd(), 'data');
            }
        }
        if (!fs.existsSync(resolvedDir)) {
            try {
                fs.mkdirSync(resolvedDir, { recursive: true });
            }
            catch { }
        }
        this.filePath = path.join(resolvedDir, 'user_feedback.json');
        this.loadFromDisk();
    }
    async recordFeedback(item) {
        const feedbackRecord = {
            id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            timestamp: Date.now(),
            ...item,
        };
        // Update existing message feedback if already submitted
        const existingIndex = this.feedbackItems.findIndex((f) => f.userId === item.userId && f.messageId === item.messageId);
        if (existingIndex !== -1) {
            this.feedbackItems[existingIndex] = feedbackRecord;
        }
        else {
            this.feedbackItems.unshift(feedbackRecord);
        }
        this.saveToDisk();
        return feedbackRecord;
    }
    getFeedback(limit = 50) {
        return this.feedbackItems.slice(0, limit);
    }
    getFeedbackSummary() {
        const totalCount = this.feedbackItems.length;
        const likes = this.feedbackItems.filter((f) => f.rating === 'like').length;
        const dislikes = totalCount - likes;
        const satisfactionRate = totalCount > 0 ? parseFloat(((likes / totalCount) * 100).toFixed(1)) : 100;
        const categoryBreakdown = {};
        for (const item of this.feedbackItems) {
            if (item.category) {
                categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + 1;
            }
        }
        return {
            totalCount,
            likes,
            dislikes,
            satisfactionRate,
            categoryBreakdown,
            recentFeedback: this.feedbackItems.slice(0, 10),
        };
    }
    clear() {
        this.feedbackItems = [];
        this.saveToDisk();
    }
    saveToDisk() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.feedbackItems, null, 2), 'utf-8');
        }
        catch (err) {
            console.warn('[FEEDBACK STORE] Could not save feedback to disk:', err.message);
        }
    }
    loadFromDisk() {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                this.feedbackItems = JSON.parse(raw);
            }
        }
        catch {
            this.feedbackItems = [];
        }
    }
}
export const feedbackStore = new FeedbackStore();
