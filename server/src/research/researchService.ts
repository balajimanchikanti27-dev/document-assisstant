import { researchOrchestrator } from './researchOrchestrator.js';
import {
  WebResearchPayload,
  WebResearchResponse,
} from '../types.js';

export class WebResearchService {
  public async query(payload: WebResearchPayload): Promise<WebResearchResponse> {
    return researchOrchestrator.executeResearch(payload);
  }
}

export const webResearchService = new WebResearchService();
