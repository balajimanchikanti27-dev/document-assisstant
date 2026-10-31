import { researchOrchestrator } from './researchOrchestrator.js';
export class WebResearchService {
    async query(payload) {
        return researchOrchestrator.executeResearch(payload);
    }
}
export const webResearchService = new WebResearchService();
